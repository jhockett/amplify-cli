import generalQuestionsWalkthrough from './generalQuestionsWalkthrough';
import autogeneratedParameters from './autogeneratedParameters';
import { runtimeWalkthrough, templateWalkthrough } from '../utils/functionPluginLoader';
import _ from 'lodash';
import { FunctionParameters, ProjectLayer } from 'amplify-function-plugin-interface';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import { ServiceName, functionParametersFileName, parametersFileName } from '../utils/constants';
import { category } from '../../../constants';
import { getNewCFNParameters, getNewCFNEnvVariables } from '../utils/cloudformationHelpers';
import { askExecRolePermissionsQuestions } from './execPermissionsWalkthrough';
import { scheduleWalkthrough } from './scheduleWalkthrough';
import { merge } from '../utils/funcParamsUtils';
import { tryUpdateTopLevelComment } from '../utils/updateTopLevelComment';
import { addLayersToFunctionWalkthrough } from './addLayerToFunctionWalkthrough';
import { convertLambdaLayerMetaToLayerCFNArray } from '../utils/layerArnConverter';
import { loadFunctionParameters } from '../utils/loadFunctionParameters';

/**
 * Starting point for CLI walkthrough that generates a lambda function
 * @param context The Amplify Context object
 */
export async function createWalkthrough(
  context: any,
  templateParameters: Partial<FunctionParameters>,
): Promise<Partial<FunctionParameters>> {
  // merge in parameters that don't require any additional input
  templateParameters = merge(templateParameters, autogeneratedParameters(context));

  // ask generic function questions and merge in results
  templateParameters = merge(templateParameters, await generalQuestionsWalkthrough(context));

  // ask runtime selection questions and merge in results
  if (!templateParameters.runtime) {
    let runtimeSelection = await runtimeWalkthrough(context, templateParameters);
    templateParameters = merge(templateParameters, runtimeSelection[0]);
  }

  // ask template selection questions and merge in results
  templateParameters = merge(templateParameters, await templateWalkthrough(context, templateParameters));

  if (await context.amplify.confirmPrompt('Do you want to access other resources in this project from your Lambda function?')) {
    templateParameters = merge(templateParameters, await askExecRolePermissionsQuestions(context, templateParameters.functionName));
  }

  // ask scheduling Lambda questions and merge in results
  templateParameters = merge(templateParameters, await scheduleWalkthrough(context, templateParameters));

  // ask lambda layer questions and merge in results
  templateParameters = merge(templateParameters, await addLayersToFunctionWalkthrough(context, templateParameters.runtime));
  return templateParameters;
}
/**
 * TODO this function needs to be refactored so it doesn't have side-effects of writing to CFN files
 */
export async function updateWalkthrough(context, lambdaToUpdate?: string) {
  const lambdaFuncResourceNames = ((await context.amplify.getResourceStatus()).allResources as any[])
    .filter(resource => resource.service === ServiceName.LambdaFunction)
    .map(resource => resource.resourceName);

  if (lambdaFuncResourceNames.length === 0) {
    context.print.error('No Lambda function resource to update. Use "amplify add function" to create a new function.');
    return;
  }

  if (lambdaToUpdate) {
    if (!lambdaFuncResourceNames.includes(lambdaToUpdate)) {
      context.print.error(`No Lambda function named ${lambdaToUpdate} exists in the project.`);
      return;
    }
  } else {
    const resourceQuestion = [
      {
        name: 'resourceName',
        message: 'Select the Lambda function you want to update',
        type: 'list',
        choices: lambdaFuncResourceNames,
      },
    ];
    lambdaToUpdate = (await inquirer.prompt(resourceQuestion)).resourceName as string;
  }

  // initialize function parameters for update
  const functionParameters: Partial<FunctionParameters> = {
    resourceName: lambdaToUpdate,
    environmentMap: {
      ENV: {
        Ref: 'env',
      },
      REGION: {
        Ref: 'AWS::Region',
      },
    },
  };

  const projectBackendDirPath = context.amplify.pathManager.getBackendDirPath();
  const resourceDirPath = path.join(projectBackendDirPath, category, functionParameters.resourceName);
  const currentParameters = loadFunctionParameters(context, resourceDirPath);

  if (
    await context.amplify.confirmPrompt('Do you want to update the Lambda function permissions to access other resources in this project?')
  ) {
    merge(functionParameters, await askExecRolePermissionsQuestions(context, lambdaToUpdate, currentParameters.permissions));

    const cfnFileName = `${functionParameters.resourceName}-cloudformation-template.json`;
    const cfnFilePath = path.join(resourceDirPath, cfnFileName);
    const cfnContent = context.amplify.readJsonFile(cfnFilePath);
    const dependsOnParams = { env: { Type: 'String' } };

    Object.keys(functionParameters.environmentMap)
      .filter(key => key !== 'ENV')
      .filter(key => key !== 'REGION')
      .filter(resourceProperty => 'Ref' in functionParameters.environmentMap[resourceProperty])
      .forEach(resourceProperty => {
        dependsOnParams[functionParameters.environmentMap[resourceProperty].Ref] = {
          Type: 'String',
          Default: functionParameters.environmentMap[resourceProperty].Ref,
        };
      });

    cfnContent.Parameters = getNewCFNParameters(
      cfnContent.Parameters,
      currentParameters,
      dependsOnParams,
      functionParameters.mutableParametersState,
    );

    if (!cfnContent.Resources.AmplifyResourcesPolicy) {
      cfnContent.Resources.AmplifyResourcesPolicy = {
        DependsOn: ['LambdaExecutionRole'],
        Type: 'AWS::IAM::Policy',
        Properties: {
          PolicyName: 'amplify-lambda-execution-policy',
          Roles: [
            {
              Ref: 'LambdaExecutionRole',
            },
          ],
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [],
          },
        },
      };
    }

    if (functionParameters.categoryPolicies.length === 0) {
      delete cfnContent.Resources.AmplifyResourcesPolicy;
    } else {
      cfnContent.Resources.AmplifyResourcesPolicy.Properties.PolicyDocument.Statement = functionParameters.categoryPolicies;
    }

    cfnContent.Resources.LambdaFunction.Properties.Environment.Variables = getNewCFNEnvVariables(
      cfnContent.Resources.LambdaFunction.Properties.Environment.Variables,
      currentParameters,
      functionParameters.environmentMap,
      functionParameters.mutableParametersState,
    );

    context.amplify.writeObjectAsJson(cfnFilePath, cfnContent, true);
    tryUpdateTopLevelComment(resourceDirPath, _.keys(functionParameters.environmentMap));
  } else {
    // Need to load previous dependsOn
    functionParameters.dependsOn = _.get(context.amplify.getProjectMeta(), ['function', lambdaToUpdate, 'dependsOn'], []);
  }

  // ask scheduling Lambda questions and merge in results
  const cfnParameters = context.amplify.readJsonFile(path.join(resourceDirPath, parametersFileName), undefined, false) || {};
  const scheduleParameters = {
    cloudwatchRule: cfnParameters.CloudWatchRule,
    resourceName: functionParameters.resourceName,
  };
  merge(functionParameters, await scheduleWalkthrough(context, scheduleParameters));

  const functionRuntime = context.amplify.readBreadcrumbs(context, category, functionParameters.resourceName).functionRuntime as string;
  const currentFunctionParameters =
    context.amplify.readJsonFile(path.join(resourceDirPath, functionParametersFileName), undefined, false) || {};
  merge(
    functionParameters,
    await addLayersToFunctionWalkthrough(context, { value: functionRuntime }, currentFunctionParameters.lambdaLayers),
  );

  // writing to the CFN here because it's done above for the schedule and the permissions but we should really pull all of it into another function
  const cfnFileName = `${functionParameters.resourceName}-cloudformation-template.json`;
  const cfnFilePath = path.join(resourceDirPath, cfnFileName);
  const cfnContent = context.amplify.readJsonFile(cfnFilePath);

  // check for layer parameters if not added
  functionParameters.lambdaLayers.forEach(layer => {
    const resourceName = _.get(layer as ProjectLayer, ['resourceName'], null);
    if (resourceName) {
      const param: string = `function${resourceName}Arn`;
      if (cfnContent.Parameters[`${param}`] === undefined) {
        cfnContent.Parameters[`${param}`] = {
          Type: 'String',
          Default: `${param}`,
        };
      }
    }
  });
  cfnContent.Resources.LambdaFunction.Properties.Layers = convertLambdaLayerMetaToLayerCFNArray(
    functionParameters.lambdaLayers,
    context.amplify.getEnvInfo().envName,
  );
  context.amplify.writeObjectAsJson(cfnFilePath, cfnContent, true);

  return functionParameters;
}

export function migrate(context, projectPath, resourceName) {
  const resourceDirPath = path.join(projectPath, 'amplify', 'backend', category, resourceName);
  const cfnFilePath = path.join(resourceDirPath, `${resourceName}-cloudformation-template.json`);
  const oldCfn = context.amplify.readJsonFile(cfnFilePath);
  const newCfn: any = {};
  Object.assign(newCfn, oldCfn);

  // Add env parameter
  if (!newCfn.Parameters) {
    newCfn.Parameters = {};
  }
  newCfn.Parameters.env = {
    Type: 'String',
  };

  // Add conditions block
  if (!newCfn.Conditions) {
    newCfn.Conditions = {};
  }
  newCfn.Conditions.ShouldNotCreateEnvResources = {
    'Fn::Equals': [
      {
        Ref: 'env',
      },
      'NONE',
    ],
  };

  // Add if condition for resource name change
  const oldFunctionName = newCfn.Resources.LambdaFunction.Properties.FunctionName;

  newCfn.Resources.LambdaFunction.Properties.FunctionName = {
    'Fn::If': [
      'ShouldNotCreateEnvResources',
      oldFunctionName,
      {
        'Fn::Join': [
          '',
          [
            oldFunctionName,
            '-',
            {
              Ref: 'env',
            },
          ],
        ],
      },
    ],
  };

  newCfn.Resources.LambdaFunction.Properties.Environment = { Variables: { ENV: { Ref: 'env' } } };

  const oldRoleName = newCfn.Resources.LambdaExecutionRole.Properties.RoleName;

  newCfn.Resources.LambdaExecutionRole.Properties.RoleName = {
    'Fn::If': [
      'ShouldNotCreateEnvResources',
      oldRoleName,
      {
        'Fn::Join': [
          '',
          [
            oldRoleName,
            '-',
            {
              Ref: 'env',
            },
          ],
        ],
      },
    ],
  };

  const jsonString = JSON.stringify(newCfn, null, '\t');
  fs.writeFileSync(cfnFilePath, jsonString, 'utf8');
}

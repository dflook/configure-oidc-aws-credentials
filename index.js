const core = require('@actions/core');
const {STSClient, AssumeRoleWithWebIdentityCommand} = require('@aws-sdk/client-sts');

async function run() {
    try {
        const roleArn = core.getInput('role-arn', {required: true});
        const audience = core.getInput('audience', {required: false});
        const stsRegion = core.getInput('sts-region', {required: false});
        const roleSessionName = core.getInput('role-session-name', {required: false});
        const durationSeconds = parseInt(core.getInput('duration-seconds', {required: false}));
        const exportVariables = core.getBooleanInput('export-variables', {required: false});

        const id_token = await core.getIDToken(audience);

        let stsOptions = {};

        if (stsRegion) {
            stsOptions['region'] = stsRegion;
        } else {
            stsOptions['region'] = 'us-east-1';
            stsOptions['useGlobalEndpoint'] = true;
        }

        const stsClient = new STSClient(stsOptions);
        const session = await stsClient.send(new AssumeRoleWithWebIdentityCommand({
            WebIdentityToken: id_token,
            DurationSeconds: durationSeconds,
            RoleArn: roleArn,
            RoleSessionName: roleSessionName
        }));

        core.setSecret(session.Credentials.AccessKeyId);
        core.setSecret(session.Credentials.SecretAccessKey);
        core.setSecret(session.Credentials.SessionToken);

        core.setOutput('aws-access-key-id', session.Credentials.AccessKeyId);
        core.setOutput('aws-secret-access-key', session.Credentials.SecretAccessKey);
        core.setOutput('aws-session-token', session.Credentials.SessionToken);
        core.setOutput('expiration', session.Credentials.Expiration);

        if (exportVariables) {
            core.exportVariable('AWS_ACCESS_KEY_ID', session.Credentials.AccessKeyId);
            core.exportVariable('AWS_SECRET_ACCESS_KEY', session.Credentials.SecretAccessKey);
            core.exportVariable('AWS_SESSION_TOKEN', session.Credentials.SessionToken);
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();

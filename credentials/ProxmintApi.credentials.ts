import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ProxmintApi implements ICredentialType {
	name = 'proxmintApi';

	displayName = 'Proxmint API';

	icon: Icon = { light: 'file:../icons/proxmint.svg', dark: 'file:../icons/proxmint.dark.svg' };

	documentationUrl = 'https://proxmint.com/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Create one under Settings in the Proxmint dashboard. Keys start with pmk_ and are read-only.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// The usage endpoint answers 401 to a bad key and carries no secrets in its reply.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://proxmint.com',
			url: '/api/v1/usage',
			qs: { days: 1 },
			method: 'GET',
		},
	};
}

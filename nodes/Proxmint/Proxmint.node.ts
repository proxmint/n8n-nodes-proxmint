import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// Proxmint's REST API, documented at https://proxmint.com/docs/api and /openapi.json. Each
// operation is one call; the proxy username format and the account rules stay on their side.
const BASE_URL = 'https://proxmint.com/api/v1';

const productOptions = [
	{ name: 'Datacenter', value: 'datacenter' },
	{ name: 'Mobile', value: 'mobile' },
	{ name: 'Premium Residential', value: 'premium-residential' },
	{ name: 'Residential', value: 'residential' },
];

const show = (resource: string, operation: string, extra: IDataObject = {}) => ({
	show: { resource: [resource], operation: [operation], ...extra },
});

const properties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Account', value: 'account' },
			{ name: 'Connection', value: 'connection' },
			{ name: 'Pricing', value: 'pricing' },
			{ name: 'Proxy', value: 'proxy' },
			{ name: 'Usage', value: 'usage' },
		],
		default: 'proxy',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the account',
				description: 'Get the wallet balance and every product with its bandwidth left and proxy credentials',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['connection'] } },
		options: [
			{
				name: 'Check',
				value: 'check',
				action: 'Check a connection',
				description: 'Send one request through a product and report the exit IP, its country and the time taken',
			},
		],
		default: 'check',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['pricing'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get pack prices',
				description: 'Get pack sizes, prices and price per GB',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['proxy'] } },
		options: [
			{
				name: 'Generate',
				value: 'generate',
				action: 'Generate proxy lines',
				description: 'Build proxy lines with optional location targeting and sticky sessions',
			},
		],
		default: 'generate',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['usage'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get daily usage',
				description: 'Get bytes and requests per product per UTC day',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Product',
		name: 'product',
		type: 'options',
		options: productOptions,
		default: 'residential',
		displayOptions: { show: { resource: ['proxy', 'connection'] } },
	},
	{
		displayName: 'Product',
		name: 'pricingProduct',
		type: 'options',
		options: [{ name: 'All Products', value: 'all' }, ...productOptions],
		default: 'all',
		displayOptions: show('pricing', 'get'),
	},
	{
		displayName: 'Protocol',
		name: 'protocol',
		type: 'options',
		options: [
			{ name: 'HTTP', value: 'http', description: 'Also carries HTTPS' },
			{ name: 'SOCKS5', value: 'socks5' },
		],
		default: 'http',
		displayOptions: show('proxy', 'generate'),
	},
	{
		displayName: 'Session',
		name: 'session',
		type: 'options',
		options: [
			{ name: 'Rotating', value: 'rotating', description: 'A new IP on every request' },
			{ name: 'Sticky', value: 'sticky', description: 'Each line keeps one IP for a set time' },
		],
		default: 'rotating',
		displayOptions: show('proxy', 'generate'),
	},
	{
		displayName: 'Sticky Minutes',
		name: 'stickyMinutes',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 120 },
		default: 30,
		description: 'How long each line keeps its IP, from 1 to 120 minutes',
		displayOptions: show('proxy', 'generate', { session: ['sticky'] }),
	},
	{
		displayName: 'Count',
		name: 'count',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 50 },
		default: 1,
		description: 'Number of lines, each with its own IP',
		displayOptions: show('proxy', 'generate', { session: ['sticky'] }),
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{ name: 'Host:Port:User:Pass', value: 'host:port:user:pass' },
			{ name: 'URL', value: 'url', description: 'Protocol://user:pass@host:port, ready for the HTTP Request node' },
		],
		default: 'url',
		displayOptions: show('proxy', 'generate'),
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'collection',
		placeholder: 'Add Location Field',
		default: {},
		description: 'Leave empty to use the targeting saved in the Proxmint dashboard',
		displayOptions: show('proxy', 'generate'),
		options: [
			{
				displayName: 'ASN',
				name: 'asn',
				type: 'string',
				default: '',
				description: 'Carrier or ISP network number, digits only. Needs a country.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				placeholder: 'newyork',
				description: 'City name without spaces. Needs a country.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'us',
				description: 'Two-letter country code',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				placeholder: 'california',
				description: 'State or region. Needs a country.',
			},
			{
				displayName: 'ZIP Code',
				name: 'zip',
				type: 'string',
				default: '',
				description: 'ZIP or postal code. Needs a country.',
			},
		],
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		placeholder: 'us',
		description: 'Two-letter country code to test from. Leave empty for the saved targeting.',
		displayOptions: show('connection', 'check'),
	},
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 90 },
		default: 30,
		description: 'Days back from today, today included',
		displayOptions: show('usage', 'get'),
	},
];

export class Proxmint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Proxmint',
		name: 'proxmint',
		// The mint mark reads on both themes, so both variants are the same drawing.
		icon: { light: 'file:proxmint.svg', dark: 'file:proxmint.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate proxy lines and read balance, usage and prices from Proxmint',
		defaults: { name: 'Proxmint' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'proxmintApi', required: true }],
		properties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const request = buildRequest(this, resource, i);
				const data = (await this.helpers.httpRequestWithAuthentication.call(this, 'proxmintApi', {
					...request,
					url: BASE_URL + request.url,
					json: true,
				})) as IDataObject;
				if (resource === 'proxy') {
					// One item per line, so a loop or the HTTP Request node's proxy field takes it directly.
					for (const proxy of data.lines as string[]) {
						out.push({
							json: { proxy, product: data.product, protocol: data.protocol, session: data.session },
							pairedItem: { item: i },
						});
					}
				} else {
					out.push({ json: data, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// Re-wrapping an error of the same class hands back the original, so a tool error
				// keeps its message and an HTTP failure keeps its status code.
				throw error instanceof NodeOperationError
					? new NodeOperationError(this.getNode(), error, { itemIndex: i })
					: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [out];
	}
}

interface Request {
	method: IHttpRequestMethods;
	url: string;
	qs?: IDataObject;
	body?: IDataObject;
}

function buildRequest(ctx: IExecuteFunctions, resource: string, i: number): Request {
	switch (resource) {
		case 'account':
			return { method: 'GET', url: '/account' };
		case 'usage':
			return { method: 'GET', url: '/usage', qs: { days: ctx.getNodeParameter('days', i) as number } };
		case 'pricing': {
			const product = ctx.getNodeParameter('pricingProduct', i) as string;
			return { method: 'GET', url: '/pricing', ...(product === 'all' ? {} : { qs: { product } }) };
		}
		case 'connection': {
			const country = (ctx.getNodeParameter('country', i) as string).trim();
			return {
				method: 'POST',
				url: '/check',
				body: { product: ctx.getNodeParameter('product', i) as string, ...(country ? { country } : {}) },
			};
		}
		case 'proxy': {
			const session = ctx.getNodeParameter('session', i) as string;
			const location = ctx.getNodeParameter('location', i, {}) as IDataObject;
			const body: IDataObject = {
				product: ctx.getNodeParameter('product', i) as string,
				protocol: ctx.getNodeParameter('protocol', i) as string,
				session,
				format: ctx.getNodeParameter('format', i) as string,
			};
			if (session === 'sticky') {
				body.sticky_minutes = ctx.getNodeParameter('stickyMinutes', i) as number;
				body.count = ctx.getNodeParameter('count', i) as number;
			}
			for (const [key, value] of Object.entries(location)) {
				if (typeof value === 'string' && value.trim()) body[key] = value.trim();
			}
			return { method: 'POST', url: '/proxies', body };
		}
		default:
			throw new NodeOperationError(ctx.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
	}
}

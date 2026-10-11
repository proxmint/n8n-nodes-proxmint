// Offline check of Proxy > Generate: the arguments the node sends to the MCP server, and one output
// item per proxy line. Run after `npm run build`.
const assert = require('node:assert');
const path = require('node:path');
const { Proxmint } = require(path.join(__dirname, '../dist/nodes/Proxmint/Proxmint.node.js'));

const params = {
	resource: 'proxy',
	operation: 'generate',
	product: 'residential',
	protocol: 'socks5',
	session: 'sticky',
	stickyMinutes: 45,
	count: 2,
	format: 'url',
	location: { country: 'us', city: ' newyork ', zip: '' },
};
const lines = ['socks5://a:b@gw.proxmint.com:824', 'socks5://c:d@gw.proxmint.com:824'];
let sent;

const ctx = {
	getInputData: () => [{ json: {} }],
	getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
	getNode: () => ({ name: 'Proxmint' }),
	continueOnFail: () => false,
	helpers: {
		async httpRequestWithAuthentication(_credential, options) {
			sent = options.body;
			const data = { product: 'residential', protocol: 'socks5', session: 'sticky', lines, notes: [] };
			return { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify(data) }] } };
		},
	},
};

(async () => {
	const [items] = await new Proxmint().execute.call(ctx);
	assert.deepStrictEqual(sent.params, {
		name: 'generate_proxies',
		arguments: {
			product: 'residential',
			protocol: 'socks5',
			session: 'sticky',
			format: 'url',
			sticky_minutes: 45,
			count: 2,
			country: 'us',
			city: 'newyork',
		},
	});
	assert.deepStrictEqual(
		items.map((item) => item.json.proxy),
		lines,
	);
	assert.deepStrictEqual(items[1].pairedItem, { item: 0 });
	console.log('ok');
})().catch((error) => {
	console.error(error);
	process.exit(1);
});

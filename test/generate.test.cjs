// Offline check of Proxy > Generate: the request the node sends to the REST API, and one output
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
			sent = options;
			return { product: 'residential', protocol: 'socks5', session: 'sticky', lines, notes: [] };
		},
	},
};

(async () => {
	const [items] = await new Proxmint().execute.call(ctx);
	assert.strictEqual(sent.method, 'POST');
	assert.strictEqual(sent.url, 'https://proxmint.com/api/v1/proxies');
	assert.deepStrictEqual(sent.body, {
		product: 'residential',
		protocol: 'socks5',
		session: 'sticky',
		format: 'url',
		sticky_minutes: 45,
		count: 2,
		country: 'us',
		city: 'newyork',
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

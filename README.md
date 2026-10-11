# n8n-nodes-proxmint

This is an n8n community node. It lets you use [Proxmint](https://proxmint.com) proxies in your n8n workflows.

Proxmint sells residential, premium residential, datacenter and 4G/5G mobile proxies billed per GB: prepaid packs,
no subscription, and bandwidth that never expires. This node builds ready-to-use proxy lines with location
targeting and sticky sessions, tests a connection, and reads your balance, usage and the pack prices.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n
community nodes documentation. The package name is `n8n-nodes-proxmint`.

## Operations

| Resource | Operation | What it returns |
| --- | --- | --- |
| Proxy | Generate | Proxy lines, one item per line: HTTP or SOCKS5, rotating or sticky for 1 to 120 minutes, with optional country, state, city, ZIP or ASN targeting |
| Connection | Check | One request through a product: exit IP, the country Cloudflare sees it in, and the time taken |
| Account | Get | Wallet balance, and each product's status, bandwidth used and left, host, ports and username |
| Usage | Get | Gigabytes and requests per product per day, up to 90 days, with totals |
| Pricing | Get | Pack sizes, prices and price per GB for each product |

Every operation only reads. The node cannot buy, top up, change targeting or rotate a password. Connection > Check
sends one request of a few kilobytes through your product.

The node is marked usable as a tool, so an n8n AI Agent can call it too.

## Credentials

1. Sign up at [proxmint.com](https://proxmint.com) and buy a pack for the product you want to use.
2. Create an API key under **Settings** in the [dashboard](https://proxmint.com/dashboard/settings). Keys start
   with `pmk_` and are read-only.
3. In n8n, create a **Proxmint API** credential and paste the key.

Proxy > Generate returns lines that include your proxy password, because a working line needs it. Keep the
key and the workflow's execution data private, and revoke the key in Settings if it leaks.

## Compatibility

Built and linted with `@n8n/node-cli` 0.51 against `n8n-workflow` 2.16.

## Usage

To send requests through a proxy, put a Proxmint node (Proxy > Generate) before an **HTTP Request** node and set
the HTTP Request node's **Proxy** option to `{{ $json.proxy }}`. Keep the format on **URL**.

- **Rotating** gives one line, and every request through it gets a new IP.
- **Sticky** gives **Count** lines, each holding its own IP for **Sticky Minutes**. Loop over them to spread
  work across IPs that stay put, for example one per logged-in session.
- Leave **Location** empty to use the targeting saved in the Proxmint dashboard. State, city, ZIP and ASN
  need a country, and draw 2 GB from the pack for every 1 GB delivered (1x on premium residential).

The node talks to Proxmint's hosted MCP server at `https://proxmint.com/api/mcp`. Account operations share the
customer API's limit of 60 requests a minute.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Proxmint docs](https://proxmint.com/docs/quickstart)
- [Targeting and sessions](https://proxmint.com/docs/targeting)
- [Customer API](https://proxmint.com/docs/api)
- [Pricing](https://proxmint.com/pricing)

## Version history

- **0.1.0**: first release. Proxy > Generate, Connection > Check, Account > Get, Usage > Get, Pricing > Get.

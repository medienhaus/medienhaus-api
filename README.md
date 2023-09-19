<img src="./public/favicon.svg" width="70" />

### medienhaus/

Customizable modular free and open-source environment for decentralized, distributed communication and collaboration.

[Website](https://medienhaus.dev/) — [Mastodon](https://chaos.social/@medienhaus)

<br>

# medienhaus/ caching api 

The medienhaus/api is a caching API which fetches tree-structured data from [matrix] and temporarily stores it. This makes the data accessible to non-Matrix read-only applications through a REST and/or GraphQL interface. Temporarily storing the fetched data allows for revealing relationships between datasets, which is essential for many use cases involving graph-oriented data interactions.

The core use case of this caching API is to enable the creation of fast-loading, client-side-rendered front-facing websites without the need for users to interact directly with [matrix]. It is based on the NestJS framework (not written in TypeScript at the moment).

**Disclaimer:** 
While this application follows the medienhaus/ specifications, the source code of this repository is currently messy and needs a rewrite in the near future. However, due to its importance in the medienhaus/cms stack, it cannot be shut down immediately. Some functions in this repository may have been developed for specific projects, and there may still be proprietary pieces of code related to those projects.

## Installation

The application has been tested on the following operating systems: MacOS (Ventura), Ubuntu (20.04, 22.04), Raspberry Pi OS (Bullseye), and Debian (11). Node.js must be installed on the host where you plan to install this API. Node.js versions 18, 19, and 20 are supported. It might also run on other systems, but those have not been tested.

Follow these steps to install:

1. Download the application: `git clone https://github.com/medienhaus/medienhaus-api`
2. Install dependencies: `npm install`
3. Copy the config file from the example: `cp config.js.example config.js`
4. Insert your data into the config file (explained below)
5. Optional: if you don't want to run the application on port '3009', define a custom port via an '.env' file. Create one with your favourite editor or via `nano .env` and specify your own port, e.g., `API_PORT=3011`. Save the file (in the case of nano, press 'ctrl + x' and 'y').
6. Start the application via `node index.js` or `npm run start`
7. Optional: If the application needs to run permanently, create a systemd service. Use your favourite code editor or 'nano' to create a service file at `nano /etc/systemd/system/medienhaus-api.service` with the following content:

```
[Unit]
Description=medienhaus/api
After=syslog.target network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/path/to/the/medienhaus-api
# Environment=NODE_ENV=production
ExecStart=/usr/bin/node /path/to/the/medienhaus-api/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Save the file and enable the service with `systemctl enable medienhaus-api.service`. You can check if it's working with `systemctl status medienhaus-api.service`. 

8. After the initial fetch, the application should be accessible on the specified port on localhost. You can test this with `curl http://localhost:3009/api/v2`. If you receive a JSON response, everything is working as intended.

9. Optional: If you want to expose the caching API via a readable domain name instead of a port, you can achieve this with a reverse proxy like Nginx. Ensure that Nginx is installed and configured on your system, and install a certificate with Let's Encrypt Certbot (many tutorials are available for this). Here's an example Nginx server block configuration to pass the API port to a domain in Nginx. Create a file with your favourite code editor or 'nano' at `nano /etc/nginx/sites-available/api.yourdomainname.tld` with the following content:
    
```
server {
  listen 80;
  server_name api.yourdomainname.tld;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl;
  server_name api.yourdomainname.tld;

  ssl_certificate /etc/letsencrypt/live/api.yourdomainname.tld/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.yourdomainname.tld/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3009;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Save the file and create a symlink to the 'sites-enabled' folder with `ln -s /etc/nginx/sites-enable/api.yourdomainname.tld /etc/nginx/sites-available/api.yourdomainname.tld`. Check if everything works fine with `nginx -t`. If no problems occur, restart Nginx with `systemctl restart nginx`, and your application should be accessible at the defined domain.

Note: For some of the commands, you might need root privileges to execute, so add 'sudo' in front of those commands and give it a go.
## Configuration
Here you can find useful information to help you edit the `config.js` file.
### matrix

Insert your login credentials for the [matrix] server you want to fetch data from. It's essential to fill in all four keys provided in the example. The API always starts with a 'rootId' defined in the `root_context_space_id` key. From there, it checks the space children of this ID and, based on recursive algorithms, fetches data from [matrix].

It's recommended to create a dedicated bot account for fetching. This eliminates the risk of a user signing out all devices and deactivating the access token in the config, which would result in a non-functional caching API.

You can obtain an access token from a [matrix] server via the `https://content.udk-berlin.de/_matrix/client/r0/login` route. Use a 'POST' request with a JSON body like this:
```

{
	"type": "m.login.password",
	"user": "youraccountname",
	"password": "xxxxxxxxx"
}
```

### Fetch 

The fetch configuration defines how the caching API retrieves data from the [matrix] server:

- `depth` (integer): Specifies the maximal depth for recursive data retrieval.
- `max` (integer): Sets the maximum number of [matrix] spaces to cache.
- `interval` (seconds): Determines how often the caching API should fetch all data.
- `autoFetch` (boolean): Enables or disables interval-based data fetching.
- `dump` (boolean): Allows you to enable or disable the use of a previously cached dataset instead of fetching it anew.
- `initiallyLoad` (boolean): Enables or disables the initial data fetching. This is primarily needed when using dump caches.
- `noLog` (boolean): Controls whether detailed logging output is generated during data fetching.

### Interfaces

In this section, you can specify which interface routes should be publicly exposed by this application:

- `rest_v1` (boolean): Enable or disable the REST v1 interface.
- `rest_v2` (boolean): Enable or disable the REST v2 interface.
- `graphql` (boolean): Enable or disable the GraphQL interface.
- `graphql_playground` (boolean): Enable or disable the GraphQL playground.
- `post` (boolean): Enable or disable POST routes, which allow partial updates to cached data.
- `dev` (boolean): Enable or disable development routes, providing access to raw fetched data and all 'state_events' for the fetched [matrix] IDs.

### application

- `name` (String): This is the human-readable name of your application instance.
- `api_name` (String): This is the machine-readable name of your application instance. Avoid spaces in this name.
- `standards` (Array of Objects): This array should be kept as it is. :)

### ‌attributable

These type definitions are stored in the `dev.medienhaus.meta` [matrix] 'stateEvent'. For more detailed information, refer to the medienhaus/specifications documentation:

- `spaceTypes` (Object)
- `context` (Array of Strings): Corresponds with the entries from the config file for the corresponding medienhaus/cms instance.
- `item` (Array of Strings): Corresponds with the entries from the config file for the corresponding medienhaus/cms instance.
- `content` (Array of Strings): Corresponds with the entries from the config file for the corresponding medienhaus/cms instance.

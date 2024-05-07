<img src="./public/favicon.svg" width="70" />

### medienhaus/

Customizable, modular, free and open-source environment for decentralized, distributed communication and collaboration.

[Website](https://medienhaus.dev/) — [Fediverse](https://chaos.social/@medienhaus)

<br>

# medienhaus/ caching API

The medienhaus/ caching API fetches tree-structured data from [matrix] and temporarily stores it. This makes the data accessible to non-[matrix] read-only applications through a REST and/or GraphQL interface. Temporarily storing the fetched data allows for revealing relationships between datasets, which is essential for many use cases involving graph-oriented data interactions.

The core use case of this caching API is to enable the creation of fast-loading, client-side-rendered front-facing websites without the need for developers and/or users to interact directly with the [matrix] protocol API.

The medienhaus/ caching API is using the NestJS framework, favoring JavaScript over TypeScript for now.

**Disclaimer:** While this application follows the medienhaus/ specification, the source code of this repository is currently rather messy and could need a proper rewrite. However, due to its importance in the [`medienhaus-cms`](https://github.com/medienhaus/medienhaus-cms/) stack, we wanted to make the source code publicly available. Some functions in this repository may have been developed for specific projects, and there may still be proprietary, i.e. not yet generalised, pieces of code related to those projects.

## Installation

The application has been tested on the following operating systems: macOS (Ventura), Ubuntu (20.04, 22.04), Raspberry Pi OS (Bullseye), and Debian (11). Node.js must be installed on the host where you plan to install this API. Node.js versions 18, 19, and 20 are supported. It might also run on other systems, but those have not been tested.

Follow these steps to install:

1. Download the application:
   <br>
   ```
   git clone https://github.com/medienhaus/medienhaus-api
   ```

2. Install dependencies:
   <br>
   ```
   npm install
   ```

3. Copy the config file from the example:
   <br>
   ```
   cp config.example.js config.js
   ```

4. Open and modify the config file (further config details below):
   <br>
   ```
   nano config.js
   ```

5. Optional: if you don’t want to run the API on port `3009`, define a custom port via an `.env` file:
   <br>
   ```
   medienhaus_API_PORT=<YOUR_PORT_HERE>
   ```
   ```
   cat > .env << EOF
   API_PORT=${medienhaus_API_PORT}
   EOF
   ```

6. Start the application via:
   <br>
   ```
   npm run start
   ```

7. Optional: If the application needs to run permanently, you could create a systemd service.
   <br>
   ```
   medienhaus_API_DIR=$(pwd)
   ```
   ```
   cat > /etc/systemd/system/medienhaus-api.service << EOF
   [Unit]
   Description=medienhaus/api
   After=syslog.target network.target

   [Service]
   Type=simple
   User=root
   Group=root
   WorkingDirectory=${medienhaus_API_DIR}
   # Environment=NODE_ENV=production
   ExecStart=/usr/bin/node ${medienhaus_API_DIR}/index.js
   Restart=always

   [Install]
   WantedBy=multi-user.target
   EOF
   ```
   ```
   systemctl enable medienhaus-api.service
   ```
   You can check if it’s working with `systemctl status medienhaus-api.service`.

8. After the initial fetch, the application should be accessible on the specified port on localhost. If you receive a JSON response, everything is working as intended.
   <br>
   ```
   curl http://localhost:${medienhaus_API_PORT:-3009}/api/v2
   ```

9. Optional: If you want to expose the caching API via a readable domain name instead of a port, you can achieve this with a reverse proxy like Nginx. Ensure that Nginx is installed and configured on your system, and install a certificate with Let’s Encrypt Certbot (many tutorials are available for this). Here’s an example Nginx reverse proxy configuration:
   <br>
   ```
   medienhaus_API_FQDN=<YOUR_FQDN_HERE>
   ```
   ```
   cat > /etc/nginx/sites-available/medienhaus-api << EOF
   server {
     listen 80;
     server_name \${medienhaus_API_FQDN};
     return 301 https://\$server_name\$request_uri;
   }

   server {
     listen 443 ssl;
     server_name ${medienhaus_API_FQDN};

     ssl_certificate /etc/letsencrypt/live/${medienhaus_API_FQDN}/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/${medienhaus_API_FQDN}/privkey.pem;

     location / {
       proxy_pass http://127.0.0.1:${medienhaus_API_PORT:-3009};
       proxy_set_header Host \$host;
       proxy_set_header X-Forwarded-For \$remote_addr;
       proxy_set_header X-Forwarded-Proto \$scheme;
     }
   }
   EOF
   ```
   ```
   ln -s /etc/nginx/sites-available/medienhaus-api /etc/nginx/sites-enable/medienhaus-api
   ```
   Check if everything works fine with:
   ```
   nginx -t
   ```
   If no problems occur, restart Nginx with:
   ```
   systemctl restart nginx
   ```

**Note:** For some of the commands, you might need root privileges to execute: `sudo …`.

## Configuration

Here you can find useful information to help you edit the `config.js` file.

### [matrix]

Insert your login credentials for the [matrix] server you want to fetch data from. It’s essential to fill in all four keys provided in the example. The API always starts with a `rootId` defined in the `root_context_space_id` key. From there, it checks the space children of this ID and, based on recursive algorithms, fetches data from [matrix].

It’s recommended to create a dedicated bot account for fetching. This eliminates the risk of a user signing out all devices and deactivating the access token in the config, which would result in a non-functional caching API.

You can obtain an access token from a [matrix] server via the `https://content.udk-berlin.de/_matrix/client/r0/login` route. Use a `POST` request with a JSON body like this:

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
- `dev` (boolean): Enable or disable development routes, providing access to raw fetched data and all `state_events` for the fetched [matrix] IDs.

### application

- `name` (string): This is the human-readable name of your application instance.
- `api_name` (string): This is the machine-readable name of your application instance. Avoid spaces in this name.
- `standards` (array of objects): This array should be kept as it is. :)

### attributable

These type definitions are stored in the `dev.medienhaus.meta` [matrix] `stateEvent`. For more detailed information, refer to the medienhaus/ specification:

- `spaceTypes` (object)
- `context` (array of strings): Corresponds with the entries from the config file for the corresponding medienhaus/cms instance.
- `item` (array of strings): Corresponds with the entries from the config file for the corresponding medienhaus/cms instance.
- `content` (array of strings): Corresponds with the entries from the config file for the corresponding medienhaus/cms instance.

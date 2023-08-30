<img src="./public/favicon.svg" width="70" />

### medienhaus/

Customizable modular free and open-source environment for decentralized, distributed communication and collaboration.

[Website](https://medienhaus.dev/) — [Mastodon](https://chaos.social/@medienhaus)

<br>

# medienhaus/ caching api 
The medienhaus/api is a caching api which fetches tree structured data from [matrix] and stores them temporarily to make it accessible for non matrix read only applications via an REST and/or GRAPHQL interface. Through the temporarily storage of the fetched data it is possible to unveil relations between the fetched datasets which is necessary in many use cases to perform graph orientated data interactions. 
The core usecase of this caching api is to enable the creation of fast loading client side rendered front facing website without the need for users of interacting directly with [matrix]. 
It is based on the nestjs framework (for now) not written in typescript. 

**Disclaimer**
Even as this application is following the medienhaus/specifications the source code of this repository is still a huge mess and needs a rewrite in the near future. As this application is quite important for the medienhaus/cms stack it is still not possible at the moment to shut this down. There can be still proprietary pieces of code related some applied projects, where some functions of this repository were developed for. 

## Install
The application is tested on following operating systems: MacOS(Ventura), Ubuntu (20.04, 22.04) and Raspberry Pi OS (Bullseye) and Debian(11).
Node.js needs to be installed on the host your are planing to install this api to. Node.js version 18, 19 and 20 are supported with this application. 
It might run also on other systems but this is not tested. 

1. download application: `git clone https://github.com/medienhaus/medienhaus-api`
2. install dependencies: `npm install`
3. copy config file from example `cp config.js.example config.js`
4. insert your data into the config (explained below)
5. optional: if you don't want to run the application on port '3009' then it is possible to define a self specified one via an '.env' file. Just create one with our favourite editor or via `nano .env` and specify and own port, in this case 3011 `API_PORT=3011`. Save the file (in the case of nano 'ctrl + x' and 'y')
6. Start the application via `node index.js` or `npm run start`
7. Optional: If the application needs to run permanently create a systemd service. As before use your favourite code editor or 'nano' to create an service file in `nano /etc/systemd/system/medienhaus-api.service` with the content
````
[Unit]
Description=medienhaus/api
After=syslog.target network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/path/to/the/medienhaus-api
#Environment=NODE_ENV=production
ExecStart=/usr/bin/node /path/to/the/medienhaus-api/index.js
Restart=always

[Install]
WantedBy=multi-user.target
````

safe the file and enable the service via `systemctl enable medienhaus-api.service`. You can check if it worked out with checking the status via `systemctl status medienhaus-api.service`.

8. After an initial fetch the application should run and be accessible on the specified port on localhost. You can test this through `curl http://localhost:3009/api/v2` if you get some kind of json response then everything works as intended.
9. Optional: if you want to expose the caching api via a readable domain name instead of a port, this is possible via an 'reverse proxy'. You can achieve this with nginx. For sure nginx needs to be installed and configured on your system, just look it up how to do and how to install a certificate with the let's encrypt certbot (there are tones of tutorials out there therefore this will not be explained at this point). Here is an example nginx server block configuration to pass the api port to a domain in nginx: just create an file with your favourite code editor or 'nano' via `nano /etc/nginx/sites-available/api.yourdomainname.tld` with following content
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
```

Save the file and create a symlink to the 'sites-enabled' folder via `ln -s /etc/nginx/sites-enable/api.yourdomainname.tld /etc/nginx/sites-available/api.yourdomainname.tld` check if everything works fine with the `nginx -t` command. If no problems occurred you just need to restart nginx via `systemctl restart nginx` and your application should be accessible at the defined domain.

-----
**note:** 
For some of the commands you might need root privileges to execute so just add 'sudo ' in front of those commands and give it a go.


## Configuration
Here you can find some hopefully useful informations which should support you with editing the `config.js`.

### matrix
Insert here your login credentials of the matrix server you want to fetch. It is absolut nessesrary that all 4 keys given in the example needs to be filled. The api starts always with one 'rootId' which is defined in the `root_context_space_id` key. From there on it is checking the space children of this id and based on recession algorithms fetches into an [matrix] datanetwork.

It makes the most sense to create a dedicated bot account which does the fetching. This would eliminate the risk that a user would sign out all devices and the access token in the config would be inactivated, which would result in a bricked caching api.

You can get an access token from an [matrix] server via the `https://content.udk-berlin.de/_matrix/client/r0/login` route. Use a 'POST' request with a json body like this:
```
{
	"type": "m.login.password", "user": "youraccountname","password":"xxxxxxxxx"
}
```

 
### fetch
Defines the functionality of the caching api when it comes to the fetching of the data from the [matrix] server itself. 

- `depth` — integer — maximal depth for recessions 
- `max` — integer — maximal amount of cached [matrix] spaces
- `interval` — seconds — how often shall the caching api fetch all data
- `autoFetch` — boolean — enable/disable interval fetching
- `dump` — boolean — enable/disable the usage of a previously fetched cache instead of fetching it new.
- `initalyLoad` — boolean — enable/disable to fetches data initially once. This is only needed for used dump caches.
- `noLog` — boolean — creates more detailed Logoutput while fetching

### interfaces
Which interfaces routes shall be publicly exposed with this application? 
- `rest_v1` — boolean — enable/ disable rest v1 interface.
- `rest_v2` — boolean — enable/ disable rest v2 interface. 
- `graphql` — boolean — enable/ disable graqhql interface.
- `graphql_playground` — boolean — enable/ disable playground for graphql. 
- `post` — boolean — enable/ disable post routes which partially updates the cached data.
- `dev` — boolean — enable/ disable develop routes which gives access to the raw fetched data as well as all 'state_events' for the fetched [matrix] id's. 

### application

- `name` — String — Human Readable name of this application instance
- `api_name` — String — machine readable name of this application instance. Avoid spaces in here. 
- `standards` — Array of Objects — just keep it as it is :)

### ‌attributable
Type definitions which are stored in the `dev.medienhaus.meta` [matrix] 'stateEvent'. It is explained in detail in the medienhaus/specifications.

- `spaceTypes` — Object
-- `context` — Array of Strings — should correspond with the entries from the config file for the corresponding medienhaus/cms instance.
-- `item` — Array of Strings — should correspond with the entries from the config file for the corresponding medienhaus/cms instance.
-- `content` — Array of Strings — should correspond with the entries from the config file for the corresponding medienhaus/cms instance.

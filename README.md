# The Vault Keeper

**The Vault Keeper** is a self-hosted, private cloud storage platform that gives you full control over your files; there's no third-party data mining and no subscriptions. Upload, manage, and download your files through a clean web interface, all running on your own machine.


## Requirements

Before you begin, make sure you have the following installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes both Docker and Docker Compose)


## Quick Start

**1. Download the `docker-compose.yml` file from the [latest release](https://github.com/cis3296s26/The-Vault-Keeper/releases).**

Place it in its own folder, for example:

```
my-vault/
└── docker-compose.yml
```


**2. Open a terminal and navigate to the folder where you saved the file.**

To do this on Windows:

1. Open the folder in File Explorer so you can see the `docker-compose.yml` file inside
2. Click the address bar at the top of the File Explorer window to highlight the folder path, then copy it (Ctrl + C)
3. Click the Windows search bar at the bottom of your screen, type `cmd`, and click **Command Prompt**
4. In the Command Prompt window, type `cd` followed by a space, then paste the path you copied. Make sure to wrap it in quotes and press Enter:

```
cd "C:\Users\YourName\my-vault"
```
To do this on Mac:

1. Navigate to the folder that contains your `docker-compose.yml` file inside, but don't go into it
2. Right click on the folder and select 'New Terminal at Folder'
3. If you do not see that option, open the terminal by searching for it in Spotlight Search or your Applications Folder
4. Type `cd` followed by a space, then drag and drop the folder containing your `docker-compose.yml` file inside and press Retrun

Once you're in the right folder, run:

```bash
docker compose up
```

Docker will pull the latest images and start both the backend and frontend automatically. The first run may take a minute or two to download everything. You'll see a stream of log messages, that's normal. The app is ready when the messages slow down and you see output from both the frontend and backend services.

**3. Open your browser and go to:**

```
http://localhost:5173
```

Your Vault Keeper is ready to use.

---

## Stopping the App

Go back to the Command Prompt window you opened in Step 2; the one showing the running log messages. Press `Ctrl + C` to stop the app. You should see the services begin to shut down.

If that does not work, or if you closed that window, open a new Command Prompt, navigate back to your vault folder the same way as before (cd "your\folder\path"), and run:

```bash
docker compose down
```

---

## Your Files Are Safe Between Restarts

The Vault Keeper automatically stores your uploaded files and database in a `data/` folder next to your `docker-compose.yml`. As long as you keep that folder, your files will persist across restarts and updates.

```
my-vault/
├── docker-compose.yml
└── data/
    ├── files/        ← your uploaded files live here
    └── vault-keeper.db
```

> **Do not delete the `data/` folder** unless you want to wipe all stored files.

---

## Features

- **Upload files** of any type through a simple modal dialog
- **View and download** your stored files directly from the browser
- **Delete files** with a confirmation prompt to prevent accidents
- **Search** your files by name
- **Paginated file table** for comfortable browsing when your vault grows

---

## Updating to a New Version

When a new version of The Vault Keeper is released, you can update without losing any of your files. Updating means downloading the latest version of the app's code (packaged as Docker images) and restarting everything with that new code.

Open a Command Prompt and navigate to your vault folder the same way as in Step 2 (`cd "your\folder\path"`), then run these two commands one at a time:

```bash
docker compose pull
```

This downloads the latest version of the Vault Keeper images from the internet.

```bash
docker compose up
```

This starts the app back up using the newly downloaded version, exactly like when you first ran it.

Your `data/` folder and all the files inside it will not be touched during this process.

---

## Ports

A **port** is like a numbered door on your computer that a specific service listens on. When you visit `http://localhost:5173`, you're telling your browser to connect to your own machine (`localhost`) through door number `5173`, where the Vault Keeper frontend is waiting. The Vault Keeper uses two ports:

| Service  | Port   | URL                        |
|----------|--------|----------------------------|
| Frontend | `5173` | http://localhost:5173      |
| Backend  | `8000` | http://localhost:8000/docs |

The **frontend** (port `5173`) is the visual interface you use in your browser like the file table, upload button, and everything you see and click on.

The **backend** (port `8000`) is the engine running behind the scenes. It handles actually storing, retrieving, and deleting your files. You never need to interact with it directly.

That said, the backend also comes with a built-in **API explorer**, accessible at `http://localhost:8000/docs`. This is an interactive webpage (provided automatically by the backend framework) that lists every available operation the backend supports: things like uploading a file, listing files, or deleting one. You can test these operations directly from the page without touching the frontend. It's mainly useful for debugging or curiosity, and most users will never need it.

---

## Accessing from Other Devices on Your Network

Because both ports (`5173` and `8000`) are bound to all network interfaces by default, any device on the same local network can reach your Vault Keeper.

**1. Find the local IP address of the machine running Docker.**

You need to do this on the machine that is actually running the app (i.e. where you ran `docker compose up`). Open a Command Prompt or terminal on that machine and run one of the following commands depending on your operating system:

- **Windows:** Open Command Prompt (search `cmd` in the Windows search bar) and type `ipconfig`, then press Enter. Look for the line that says **IPv4 Address** under your active network adapter, it will look something like `192.168.1.50`.
- **macOS:** Open Terminal (search for it in Spotlight) and run `ifconfig`. Look for the `inet` line under `en0` (Wi-Fi) or `en1`.
- **Linux:** Open a terminal and run `ip a`. Look for the `inet` line under your active network interface (often `eth0` or `wlan0`).

**2. From any other device on the same Wi-Fi or LAN, open a browser and go to:**

```
http://<host-ip>:5173
```

For example: `http://192.168.1.50:5173`

The frontend is configured to automatically talk to the backend at the same IP address, so uploads, downloads, and deletes will all work normally without any extra setup.

> **Note:** This only works within your local network. The Vault Keeper is not exposed to the internet unless you explicitly configure port forwarding on your router, which is not recommended without additional security measures.

---

## Troubleshooting

**The page won't load at `localhost:5173`**
Make sure Docker Desktop is running and that `docker compose up` completed without errors. Check the terminal output for any red error lines.

**Port already in use**
If you see a port conflict error, another application on your machine is using port `5173` or `8000`. You can edit the `docker-compose.yml` to change the host-side port (the number on the left of the `:`).

**Files uploaded previously are gone**
Check that the `data/` folder still exists in the same directory as your `docker-compose.yml`. If you ran the compose file from a different directory, a new `data/` folder may have been created there instead.


# Description

This is a project for my girlfriend, Rachael, for her birthday! I'll be making her a little device with a Raspberry Pi Zero 2 W with a screen that displays messages I send to her (we're long distance)! This repo contains only the code for the website I will use for sending, storing, and fetching messages. The Pi code lives in a different repo!

# OS changes

The following was added to the PiOS image's `rootfs/etc/dhcpcd.conf` to give it a static ip so i can SSH into it (at least for development)

```
interface eth0

static ip_address=192.168.4.2/24
static routers=192.168.4.1
static domain_name_servers=192.168.4.1`
```

Upon finishing development, we will want to likely disable SSH access to the Pi for security. We should still be able to access it via RaspberryPiConnect or whatever it's called.

However, the above seems to be unreliable. So for local testing, run

```
nmap -sn 192.168.1.0/24
```

find the hostname `mm-hearts-rd` and find its IP address. Then, simply

```
ssh [FOUND IP]
```

OR just

```
ssh mmoorman@mm-hearts-rd
```

You will need to enter the password you stored in your Apple passwords app if not on your Pop_OS! system, which has a generated SSH key.

To remote into the pi via cursor, run

`cursor --folder-uri vscode-remote://ssh-remote+<hostname>/<folder_path>`

# Other changes and steps to document

Items Bought:

1. Raspberry Pi and a second one presoldered to make sure
2. LCD screens
3. Solder Iron
4. Dupont jumper cables
5. SIM Card
6. SIM to Modem USB adapter
7. Y cable splitter to make that work

# Deployment

Will be using a subdomain of my main domain, `rachael.michaeljmoorman.com`, in order to host it.

Run `vercel dev` to test locally. 

##

In general, consider this code self-documented!

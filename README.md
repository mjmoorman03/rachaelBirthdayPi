# Description

This is a project for my girlfriend, Rachael, for her birthday! I made her a little device with a Raspberry Pi Zero 2 W with an SSD1306 OLED screen that displays messages I send to her (we're long distance)! This repo contains only the code for the website I use for sending, storing, and fetching messages. The Pi code lives in a different repo.

The device uses a ZTE MF820B cellular modem with a Hologram SIM card to connect to the internet independently, so it doesn't need her WiFi at all. Messages are sent from a Vercel-hosted website at `rachael.michaeljmoorman.com`, which POSTs directly to a local server running on the Pi, exposed via Tailscale Funnel. The Pi stores the message locally and displays it on the OLED.

# Hardware

- Raspberry Pi Zero 2 W
- SSD1306 128x64 OLED display (4-pin I2C: GND, VCC, SCK, SDA)
- ZTE MF820B unlocked USB LTE modem
- Hologram SIM card
- Micro-USB OTG Y-cable (data to Pi, extra power from wall)
- Dual-port USB wall adapter (one port for Pi PWR IN, one for Y-cable)
- 3D printed PLA enclosure (see `CAD` directory)

### OLED Wiring (I2C)

| Display Pin | Pi Physical Pin |
|---|---|
| GND | Pin 6 |
| VCC | Pin 1 (3.3V) |
| SCK | Pin 5 (GPIO 3) |
| SDA | Pin 3 (GPIO 2) |

# SSH Access

The simplest way to SSH in locally:

```
ssh mmoorman@mm-hearts-rd.local
```

Or scan the network to find the IP:

```
nmap -sn 192.168.1.0/24
```

Find the hostname `mm-hearts-rd` and use its IP:

```
ssh mmoorman@[FOUND IP]
```

You will need the password stored in Apple Passwords if not on the Pop_OS! system, which has a generated SSH key.

**Preferred method (works over cellular too):** Use the Tailscale IP. Find it at tailscale.com/admin or run `tailscale status` on any connected device, then:

```
ssh mmoorman@[TAILSCALE IP]
```

To remote in via Cursor:

```
cursor --folder-uri vscode-remote://ssh-remote+<hostname>/<folder_path>
```

# OS / System Changes

## Static IP (development only, deprecated)

The following was added to the PiOS image's `rootfs/etc/dhcpcd.conf` during early development to give it a static IP for SSH. No longer relied upon:

```
interface eth0
static ip_address=192.168.4.2/24
static routers=192.168.4.1
static domain_name_servers=192.168.4.1
```

## I2C

I2C was enabled via `sudo raspi-config` → Interface Options → I2C → Enable, to support the OLED display.

## Tailscale

Tailscale is installed and running as a system service (`tailscaled`). The device is registered under the `mjmoorman03@gmail.com` account.

Tailscale Funnel is configured persistently to expose port 8080:

```
https://mm-hearts-rd.tailb899b9.ts.net → localhost:8080
```

This is how `rachael.michaeljmoorman.com` reaches the Pi's local server.

A systemd override was created to make `tailscaled` start after `cellular.service`:

```
/etc/systemd/system/tailscaled.service.d/override.conf
```

Contents:

```ini
[Unit]
After=network-pre.target NetworkManager.service systemd-resolved.service cellular.service
Wants=cellular.service
```

## ModemManager

ModemManager is installed and **enabled** (not masked). It is used to manage the ZTE MF820B modem via `mmcli`. It was initially masked during debugging but re-enabled as it provides the most reliable modem management.

## Cellular (cellular.service)

A custom systemd service manages cellular connectivity on boot. See `cellular.sh` for the full script.

Service file: `/etc/systemd/system/cellular.service`

The script:
1. Waits for the modem to be detected by ModemManager
2. Waits for network registration
3. Connects via `mmcli --simple-connect="apn=hologram"` with retries
4. Gets an IP via `udhcpc -i wwan0`
5. Adds a default route via wwan0 with metric 700 (lower priority than WiFi when both present)

Key notes:
- LTE-only mode (`4g preferred`) persists in modem firmware across reboots — does not need to be set each boot
- The modem requires ~35-40 seconds after boot before it will accept a connection — the script waits for ModemManager to report `state: registered` before attempting
- `--client-no-release-cid` is used, so stale CIDs accumulate — the script clears them with `--wds-stop-network=0xffffffff` before connecting

## Message Display (messagedisplayer.service)

A custom systemd service runs the Pi's local Python server. It starts after and requires `cellular.service`.

Service file: `/etc/systemd/system/messagedisplayer.service`

The server:
- Listens on port 8080
- Accepts POST requests to `/message` with a bearer token
- Stores the message to a local file
- Reads the file and updates the OLED display

A failure service (`messagedisplayer-failed.service`) is also configured via `OnFailure=`.

## Cron Jobs (root)

Root crontab (`sudo crontab -e`) contains the following:

```
0 */3 * * * /sbin/reboot
5 * * * * /bin/systemctl restart tailscaled
```

- **Reboot every 3 hours** — ensures the device doesn't get into a stuck state over time
- **Restart tailscaled at 5 minutes past every hour** — ensures Tailscale tunnel recovers if it gets stuck. Staggered 5 minutes after the reboot job so they never overlap

## Raspberry Pi Connect

Pi Connect was installed and tested but **not relied upon** — it failed to switch from WiFi to cellular when WiFi was brought down. Tailscale is used instead for all remote access.

# Deployment

The frontend/backend lives at `rachael.michaeljmoorman.com` on Vercel.

Run `vercel dev` to develop locally.

Run `npm run test` to test with Vitest.

The Vercel backend authenticates requests and POSTs directly to the Pi via Tailscale Funnel. No polling is used — messages are pushed directly to the device.

# 3D Models

See the `CAD` directory. The enclosure is printed in white PLA, split into two halves and joined with super glue. The OLED display window is cut into the top face. Components are mounted internally with adhesive foam pads.

# Items Bought

1. Raspberry Pi Zero 2 W (x2 — second one came pre-soldered)
2. SSD1306 OLED display
3. Soldering iron + solder + tip tinner
4. Dupont jumper cables (female-to-female)
5. Hologram SIM card
6. ZTE MF820B unlocked USB LTE modem
7. Micro-USB OTG Y-cable
8. Dual-port USB wall adapter
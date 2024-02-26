<p align="center">
   <a href="https://github.com/un/webhook-proxy/stargazers"><img src="https://img.shields.io/github/stars/un/webhook-proxy?logo=github&style=for-the-badge&color=yellow" alt="Github Stars"></a>
</p>
<p align="center">
   <a href="https://github.com/un/webhook-proxy/pulse"><img src="https://img.shields.io/github/commit-activity/m/un/webhook-proxy?style=for-the-badge&color=green" alt="Commits-per-month"></a>
</p>
<p align="center" style="margin-top: 12px">
  <a href="https://unwebhook.com">
   <img width="250px" src="https://avatars.githubusercontent.com/u/135225712?s=400&u=72ad315d63b0326e5bb34377c3f59389373edc9a&v=4" alt="UnWebhook Logo">
  </a>

  <h1 align="center"><tt>UnWebhook</tt></h1>
  <h2 align="center">A simple tool for working with webhooks</h2>

<p align="center">
    <a href="https://UnWebhook.com"><strong>To our Website & App »</strong></a>
    <br />
    <br />
    <h3>By the <strong>Un</strong> team, building <a href="https://github.com/un/inbox"><strong>UnInbox</strong></a></h3>
    <a href="https://twitter.com/UnInbox">UnInbox Twitter</a> - 
    <a href="https://discord.gg/QMV9p9sgza">UnInbox Discord Server</a>
  </p>
</p>

---

![Screenshot of UnWebhook](screenshot.png)

## About

A simple tool for working with webhooks.
Great for teams and staging environments.

Watch the introduction video [on youtube](https://youtu.be/q3dS1leG1wQ)

Capabilities

- add multiple endpoints
- save received messages (for 7 days)
- automatically forward incoming messages to one or more destinations
- choose forwarding strategy (send to: first in list, all in list)
- support fallback forwarding (if first is down, forward to next)
- replay webhook delivery (resend the data to destinations)

_Want to send messages to your local machine and need a tunnel?
Check out [untun](https://github.com/unjs/untun) by the UnJs team_

---

## Tech Stack

`UnWebhook` is built with the following epic technologies & tools:

- [Nuxt JS](https://nuxt.com) Vue based FrontEnd & Backend + modules
- [Tailwind](https://tailwindcss.com/) CSS Engine
- [tRPC](https://trpc.io/) Typesafe APIs
- [DrizzleORM](https://orm.drizzle.team/) ORM + MySQL

## Running Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites

Here is what you need to be able to run UnInbox locally.

- A Supabase database
- Node.js (Version: >=20.x)
- NVM (Node Version Manager) (see https://github.com/nvm-sh/nvm)
- pnpm (see https://pnpm.io/installation)

### Setup

1. Clone the repo into a public GitHub repository (or fork https://github.com/un/webhook-proxy/fork). If you plan to distribute the code, keep the source code public to comply with [AGPLv3](https://github.com/un/webhook-proxy/blob/main/LICENSE). To clone in a private repository, contact us to acquire a commercial license

   ```sh
   git clone https://github.com/un/webhook-proxy.git UnWebhook
   ```

   > If you are on Windows, run the following command on `gitbash` with admin privileges: <br> > `git clone -c core.symlinks=true https://github.com/un/webhook-proxy.git` <br>
   > See [docs](https://cal.com/docs/how-to-guides/how-to-troubleshoot-symbolic-link-issues-on-windows#enable-symbolic-links) for more details.

2. Go to the project folder

   ```sh
   cd UnWebhook
   ```

3. Check and install the correct node/pnpm versions

   ```sh
   nvm install
   ```

4. Install packages with pnpm

   ```sh
   pnpm i
   ```

5. Set up your `.env` file

   - Duplicate `.env.example` to `.env`. This file is already pre-configured for use with the local docker containers

     mac

     ```sh
      cp .env.example .env
     ```

     windows

     ```sh
      copy .env.example .env
     ```

6. Set your env variables

7. Sync the schema with the database:

   ```sh
   pnpm run db:push
   ```

8. Start the app and all services

   ```sh
   pnpm run dev
   ```

## Self Hosting

Self hosting is encouraged, deploy to Vercel with Supabase as the DB

If you deploy to Supabase, enable the pg_cron extension to automatically delete messages after 7 days:

1. Click `Database` in the sidebar > `Extensions` > search for and enable `pg_cron`
2. Go to SQL editor, paste and run the following sql statements

```sql
select cron.schedule (
    'cleanup-messages',
    '30 3 * * 6',
    $$ delete from messages where created_at < now() - interval '1 week' $$
);
```

```sql
select cron.schedule (
    'cleanup-deliveries',
    '30 3 * * 6',
    $$ delete from message_deliveries where created_at < now() - interval '1 week' $$
);
```

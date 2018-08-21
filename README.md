# pd

This powers `pauldariye.com`, built using [`micro`](https://github.com/zeit/micro) and deployed on [`now`](https://zeit.co/now).

The inspiration for this comes from the native behavior you get when deploying
static directories using [`now`](https://zeit.co/now). Under the hood, they make
use of the [`serve`](https://github.com/zeit/serve) library.

I reused a lot of the code from this awesome library [`micro-gallery`](https://github.com/andreasmcdermott/micro-gallery). Inspiration also came from @rauchg's blog and work with the [Zeit](https://zeit.co) team.

Check out other awesome things others have built using
[`micro`](https://github.com/amio/awesome-micro).

## Usage

### Development

Install and run:

```bash
git clone git@github.com:pauldariye/pd.git
cd pd && yarn
yarn start
```

Visit [`http://localhost:3000`](http:localhost:3000)


### Deployment

Use the single command to deploy with [`now`](https://github.com/zeit/now-cli).
You may need to install this package on your machine.

```bash
now
```

## Architecture

The entire "app" is one function that routes using the `url` property on the `req`
object. It is as basic as they come.

### Directories

Every directory in the `root` of our site, in my case `_pd` is included in the directory listings unless it is blacklisted.

### Posts

Posts are generated on the fly from any file in a directory with the `.md` extension to `html` using [`showdownjs`](https://github.com/showdownjs/showdown) and injected into the page markup using the template found in `./views/index.hbs`.


## Future plan

Just like @andreasmcdermott's [`micro-gallery`](https://github.com/andreasmcdermott/micro-gallery) lib, I would like to make this a tool available to anyone. The goal is to be able to host a site like mine on pretty much any environment that supports `markdown`. Just like my site, you will be able to read your blog posts on GitHub, the web, or any place else. I would like to call it `micro-site`.

## Acknowledgements
- [`micro-gallery`](https://github.com/andreasmcdermott/micro-gallery)


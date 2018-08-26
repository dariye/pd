/**
 * TODO
 * [] Add zip file download for oss (with hover animation for download or share?)
 * [x] Update styles for posts
 * [x] Add image rendering for posts
 * [x] Migrate all content from blog.pauldariye.com
 * [] Add night theme
 * [x] Add progress indicator for posts
 * [ ] Add view counter
 * [] Add ga
 * [] a11y
 * [] audio/media/image styles --- keep it simple .. black/white/monotone --
 * futuristic
 * [] serviceworkers
 * [x] lru-cache
 * [] SEO
 * [] add twitter, github, icons
 * [] Code snippet copy to clipboard
 * [] Add hearts
 * [] Copy code snippet
 * 
 * micro-site features
 * [] custom styles for general layout and code
 */

const fs = require('fs')
const path = require('path')
const toPromise = require('denodeify')
const { send } = require('micro')
const mime = require('mime')
const { parse } = require('url')
const { green, red } = require('chalk')
const handlebars = require('handlebars')
const showdown = require('showdown')
const twitter = require('showdown-twitter')
const youtube = require('showdown-youtube')
const hljs = require('highlight.js')
const unslug = require('unslug')
const LRUCache = require('lru-cache')

const ssrCache = new LRUCache({
  max: 100,
  maxAge: 1000 * 60 * 60
})

const relativePathExtension = function (path) {
  const self = this
  this.relativePath = path || '/'
  this.extension = function () {
    return [
      {
        type: 'lang',
        filter: function (text) {
          const data = { relativePath: self.relativePath }
          return handlebars.compile(text)(data)
        }
      }
    ]
  }
}

const relativeExtension = new relativePathExtension()
showdown.extension('relative', relativeExtension.extension)

const videoExtension = function () {
  return [
    {
      type: 'lang',
      filter: function (text, converter, options) {
        const regex = /!\[[^\]]*\]\(.*?\.(?:mp4).*?(?=\"|\))(\".*\")?\)/g
        const matches = regex.exec(text)
        console.log(matches)
        return text
      }
    }
  ]
}

showdown.extension('video', videoExtension)

showdown.extension('codehighlight', function() {
  function htmlunencode(text) {
    return (
      text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
      );
  }
  return [
    {
      type: 'output',
      filter: function (text, converter, options) {
        // use new shodown's regexp engine to conditionally parse codeblocks
        var left  = '<pre><code\\b[^>]*>',
            right = '</code></pre>',
            flags = 'g',
            replacement = function (wholeMatch, match, left, right) {
              // unescape match to prevent double escaping
              match = htmlunencode(match);
              return left + hljs.highlightAuto(match).value + right;
            };
        return showdown.helper.replaceRecursiveRegExp(text, replacement, left, right, flags);
      }
    }
  ];
});

const converter = new showdown.Converter({
  parseImageDimension: true,
  encodeEmails: true,
  openLinksInNewWindow: true,
  smartIndentationFix: true,
  smoothLivePreview: true,
  extensions: ['youtube', 'relative', 'codehighlight', 'video']
})
converter.setFlavor('github')

/**
 * Handlebar helpers
 */
handlebars.registerHelper('year', () => new Date().getFullYear())

const defaultPort = 3000

const imageExtensions = new Set([
  '.jpeg',
  '.jpg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
  '.ico',
  '.svg'
])

const downloadExtensions = new Set([
  '.zip',
  '.pdf'
])

const ignoredFiles = new Set(['.git', '.DS_Store', '404', '500', 'pdbot'])
const root = path.resolve(process.cwd(), '_pd')
const rootObj = path.parse(root)
const isDirectory = async directory => {
  try {
    const stats = await toPromise(fs.stat)(directory)
    return stats.isDirectory()
  } catch (err) {
    return false
  }
}

const exists = async filePath => {
  try {
    await toPromise(fs.stat)(filePath)
    return true
  } catch(err) {
    return false
  }
}

let cachedView = null
const getView = async () => {
  if (!cachedView || process.env.NODE_ENV === 'development') {
    try {
      const file = await toPromise(fs.readFile)(
        path.resolve(__dirname, './views/index.hbs'),
        'utf8'
      )
      cachedView = handlebars.compile(file)
    } catch(err) {
      throw err
    }
  }
  return cachedView
}

let cachedAsset = {}
const getAsset = async assetPath => {
  if (!cachedAsset[assetPath] || process.env.NODE_ENV === 'development') {
    try {
      const file = await toPromise(fs.readFile)(
        path.resolve(__dirname, './assets', assetPath),
        'utf8'
      )
      cachedAsset[assetPath] = file
    } catch(err) {
      throw err
    }
  }
  return cachedAsset[assetPath]
}

const toHtml = async (dirPath, filePath) => {
  const file = await toPromise(fs.readFile)(filePath, 'utf8')
  relativeExtension.relativePath = dirPath.replace(rootObj.name, '')
  if (file) return converter.makeHtml(file)
}

const isMarkdown = pathObj => {
  if (pathObj.ext === '.md') return true
  return false
}

const getCacheKey = dirPath => `${dirPath}`

const renderDir = async directory => {
  const files = await toPromise(fs.readdir)(directory)
  const dirObj = path.parse(directory)
  let dirPath = `${dirObj.dir}/${dirObj.base}`.replace(`${rootObj.dir}/`, ``)
  let dirPathParts = dirPath.split('/')

  const key = getCacheKey(dirPath)

  if (ssrCache.has(key)) {
    return ssrCache.get(key)
  }

  const data = {
    directories: [],
    images: [],
    downloads: [],
    path: [],
    page: {},
    assetsDir: '/assets',
    folder: dirObj.name,
  }

  let url = []
  for (let i = 0; i < dirPathParts.length; ++i) {
    if (dirPathParts[i] !== rootObj.base) {
      url.push(dirPathParts[i])
    }
    data.path.push({
      url: url.join('/'),
      name: dirPathParts[i]
    })
  }

  for (let i = 0; i < files.length; ++i) {
    if (ignoredFiles.has(files[i])) continue
    const filePath = path.resolve(root, path.resolve(directory, files[i]))
    const pathObj = path.parse(filePath)

    const relativeFilePath = path.relative(
      root,
      path.resolve(directory, files[i])
    )
    if (await isDirectory(filePath)) {
      data.directories.push({
        relative: relativeFilePath,
        name: files[i]
      })
    } else if (isMarkdown(pathObj)) {
      data.page.title = unslug(pathObj.name)
      data.page.canonical = `${dirPath.replace(rootObj.name, '')}/${pathObj.name}`
      data.page.content = await toHtml(dirPath, filePath)
    } else if (imageExtensions.has(pathObj.ext)) {
      data.images.push({
        relative: relativeFilePath,
        name: files[i]
      })
    } else if (downloadExtensions.has(pathObj.ext)) {
      data.downloads.push({
        relative: relativeFilePath,
        extension: pathObj.ext.replace('.', ''),
        name: files[i]
      })
    }
  }
  const view = await getView()
  const enriched = view(data)
  ssrCache.set(key, enriched)
  return enriched
}

const renderFile = async file => {
  try {
    const content = await toPromise(fs.readFile)(path.resolve(root, file))
    return {
      content,
      mime: mime.getType(file)
    }
  } catch(err) {
    throw err
  }
}

module.exports = async (req, res) => {
  const { pathname } = parse(req.url)
  const pathObj = path.parse(path.join(root, pathname))
  const reqPath = decodeURIComponent(path.format(pathObj))

  if (pathname.startsWith('/assets')) {
    const asset = await getAsset(pathname.replace('/assets/', ''))
    res.setHeader('Content-Type', `${mime.getType(pathname)}; charset=utf-8`)
    return send(res, 200, asset)
  }

  if (!await exists(reqPath)) {
    const pathObj = path.parse(path.join(root, '/404'))
    const reqPath = decodeURIComponent(path.format(pathObj))
    const renderedDir = await renderDir(reqPath)
    return send(res, 404, renderedDir)
  }

  if (pathObj.ext === '') {
    const renderedDir = await renderDir(reqPath)
    return send(res, 200, renderedDir)
  } else if (imageExtensions.has(pathObj.ext)) {
    try {
      const image = await renderFile(reqPath)
      res.setHeader('Content-Type', `${image.mime}; charset=utf-8`)
      return send(res, 200, image.content)
    } catch(err) {
      const pathObj = path.parse(path.join(root, '/500'))
      const reqPath = decodeURIComponent(path.format(pathObj))
      const renderedDir = await renderDir(reqPath)
      return send(res, 500, renderedDir)
    }
  } else if (downloadExtensions.has(pathObj.ext)) {
    try {
      const download = await renderFile(reqPath)
      res.setHeader('Content-disposition', `attachment; filename=${pathObj.name}${pathObj.ext}`)
      res.setHeader('Content-Type', `${download.mime}`)
      return send(res, 200, download.content)
    } catch(err) {
      const pathObj = path.parse(path.join(root, '/500'))
      const reqPath = decodeURIComponent(path.format(pathObj))
      const renderedDir = await renderDir(reqPath)
      return send(res, 500, renderedDir)
    }
  } else {
    const pathObj = path.parse(path.join(root, '/500'))
    const reqPath = decodeURIComponent(path.format(pathObj))
    const renderedDir = await renderDir(reqPath)
    return send(res, 500, renderedDir)
  }
}

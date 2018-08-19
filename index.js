/**
 * TODO
 * 1. Add zip file download for oss (with hover animation for download or share?)
 * 2. Update styles for posts
 * 3. Add image rendering for posts
 * 4. Migrate all content from blog.pauldariye.com
 * 5. Add night theme
 * 6. Add progress indicator for posts
 * 7. Add view counter
 * 8. Add ga
 * 9. a11y
 * 10. audio/media/image styles --- keep it simple .. black/white/monotone --
 * futuristic
 * 11. serviceworkers
 * 12. lru-cache
 * 13. SEO
 * 14. add twitter, github, icons
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
const prettify = require('showdown-prettify')
const hljs = require('highlight.js')
const LRUCache = require('lru-cache')

const ssrCache = new LRUCache({
  max: 100,
  maxAge: 1000 * 60 * 60
})

showdown.setFlavor('github')

const relativePathExtension = function (path) {
  const self = this
  this.relativePath = path || '/'
  this.extension = function () {
    return [
      {
        type: 'lang',
        regex: /\{\{([\s\S]+)\}\}/g,
        replace: function (wholematch, match) {
          let otp = ''
          if (match.trim() === 'relativePath') {
            otp = self.relativePath
          }
          return otp
        }
      }
    ]
  }
}

const relativeExtension = new relativePathExtension()
showdown.extension('relative', relativeExtension.extension)

showdown.extension('highlight', function() {
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
})
const converter = new showdown.Converter({
  omitExtraWLInCodeBlocks: true,
  ghCompatibleHeaderId: true,
  parseImgDimensions: true,
  simplifiedAutoLink: true,
  excludeTrailingPunctuationFromURLs: true,
  strikethrough: true,
  tables: true,
  ghCodeBlocks: true,
  tasklists: true,
  smoothLivePreview: true,
  smartIndentationFix: true,
  disableForced4SpacesIndentedSublists: true,
  simpleLineBreaks: true,
  requireSpaceBeforeHeadingText: true,
  ghMentions: true,
  openLinksInNewWindow: true,
  emoji: true,
  splitAdjacentBlockquotes: true,
  // youtubeHeight: '',
  // youtubeWidth: '',
  youtubeUseSimpleImg: true,
  extensions: ['twitter', 'youtube', 'prettify', 'highlight', 'relative']
})
/**
 * Handlebar helpers
 */
handlebars.registerHelper('year', () => new Date().getFullYear())

const defaultPort = 3000
const validExtensions = new Set([
  '.jpeg',
  '.jpg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
  '.ico'
])

const ignoredFiles = new Set(['.git', '.DS_Store', '_src'])
const root = path.resolve(process.cwd(), '_site')
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
  relativeExtension.relativePath = dirPath.replace('_site', '')
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
    path: [],
    content: null,
    assetsDir: '/assets',
    folder: dirObj.name
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
    const relativeFilePath = path.relative(
      root,
      path.resolve(directory, files[i])
    )
    if (await isDirectory(filePath)) {
      data.directories.push({
        relative: relativeFilePath,
        name: files[i]
      })
    } else if (isMarkdown(path.parse(filePath))) {
      data.content = await toHtml(dirPath, filePath)
    } else if (validExtensions.has(path.parse(filePath).ext)) {
      data.images.push({
        relative: relativeFilePath,
        name: files[i]
      })
    }
  }
  const view = await getView()
  const enriched = view(data)
  ssrCache.set(key, enriched)
  return enriched
}

const renderImage = async file => {
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
    return send(res, 404, 'Not Found') // Render 404
  }

  if (pathObj.ext === '') {
    const renderedDir = await renderDir(reqPath)
    return send(res, 200, renderedDir)
  } else if (validExtensions.has(pathObj.ext)) {
    try {
      const image = await renderImage(reqPath)
      res.setHeader('Content-Type', `${image.mime}; charset=utf-8`)
      return send(res, 200, image.content)
    } catch(err) {
      return send(res, 500, 'Error reading file content') // render 500
    }
  } else {
    return send(res, 400, 'Bad request') // Render 400
  }
}

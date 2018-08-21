const zoom = (img) => {
  document.body.className = 'zoomed'
  const zoomedImg = document.getElementById('zoomedImage')
  zoomedImg.parentNode.parentNode.focus()
  zoomedImg.setAttribute('src', img.getAttribute('src'))
  zoomedImg.setAttribute('title', img.getAttribute('title'))
  zoomedImg.setAttribute('alt', img.getAttribute('alt'))

  zoomedImg.setAttribute('style',
    `margin: ${(window.innerHeight - zoomedImg.height) / 2}px ${(window.innerWidth - zoomedImg.width) / 2}px;`)
}

const unzoom = () => {
  document.body.className = ''
}

const showProgressIndicator = () => {
  const scroll = document.body.scrollTop || document.documentElement.scrollTop
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
  const scrolled = (scroll/height)
  document.getElementsByTagName('progress')[0].setAttribute('value', scrolled);
}

const app = () => {
  document.body.addEventListener('click', e => {
    if (e.target.nodeName === 'IMG') {
      zoom(e.target)
    } else if (e.target.className.indexOf('js-unzoom') >= 0) {
     unzoom()
    } else {
      return
    }

    e.preventDefault()

  }, {capture: true})

  const TAB = 9
  const ESC = 27
  document.body.addEventListener('keydown', e => {
    if (document.body.className === 'zoomed') {
      if (e.which === TAB) {
        document.getElementById('zoomedImage').parentNode.focus()
      } else if (e.which === ESC) {
        unzoom()
      } else {
        return
      }

      e.preventDefault()
    }
  })
}

/**
 * Onload
 */
window.onload = () => app()
/*
  * Progress bar
  */
window.onscroll = () => showProgressIndicator()


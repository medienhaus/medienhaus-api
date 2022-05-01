function goBackInHistoryIfPossible (event) {
  if (window.history.length > 1 && document.referrer.indexOf(window.location.host) !== -1) {
    event.preventDefault()
    window.history.back()
  }
}

document.querySelector('.projectclose').parentElement.addEventListener('click', goBackInHistoryIfPossible)
document.querySelector('.back').parentElement.addEventListener('click', goBackInHistoryIfPossible)

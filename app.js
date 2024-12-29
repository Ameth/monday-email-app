import handleMicrosoftLogin from './src/mailer-front.js'

console.log('hola')
const loginBtn = document.getElementById('loginBtn')
loginBtn.addEventListener('click', handleMicrosoftLogin)
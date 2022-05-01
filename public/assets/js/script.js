/** AUDIO PLAYER **/
var audioExists = !!document.querySelector('.audio');
if(audioExists){
	console.log(audioExists)
	document.addEventListener('DOMContentLoaded', function() {
		new GreenAudioPlayer('.audio', { showTooltips: true, showDownloadButton: false, enableKeystrokes: true });
	});
}

/*
$(".hamburger").click(function () {
	//$('.naviwrap').toggleClass('open');
	if ($(this).hasClass("is-active")) {
		gsap.to(".naviwrap", { duration: 0.3, y: 0, scale: 1.1, autoAlpha: 0 });
		$('.naviwrap').removeClass('open')
	} else {
		gsap.to(".naviwrap", { duration: 0.3, y: 0, scale: 1, autoAlpha: 1 });
		$('.naviwrap').addClass('open');
	}
	$(this).toggleClass("is-active");
})
*/

/** BURGER MENU **/
const burger = document.querySelector('.hamburger');
const menu = document.querySelector('.menu');
const overlay = document.querySelector('.overlay');

burger.addEventListener('click', event => {
	burger.classList.toggle("is-active");
	menu.classList.toggle("slidein");
	overlay.classList.toggle("menuopen");
});
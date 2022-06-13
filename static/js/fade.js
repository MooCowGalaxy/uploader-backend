$.fn.isInViewport = function() {
    let elementTop = $(this).offset().top
    let elementBottom = elementTop + $(this).outerHeight()

    let viewportTop = $(window).scrollTop()
    let viewportBottom = viewportTop + window.innerHeight

    return elementBottom > viewportTop && elementTop < viewportBottom
    // return elementTop < viewportBottom
};
function checkVisibility() {
    $('.transition-on-load').each(function (i) {
        if ($(this).isInViewport() && (!$(this).hasClass('visible'))) {
            $(this).addClass('visible')
        }
        /* } else if ((!$(this).isInViewport()) && $(this).hasClass('visible')) {
            $(this).removeClass('visible')
        } */
    })
}
$(document).ready(() => {
    checkVisibility()
    $(window).scroll(() => {
        checkVisibility()
    })
})
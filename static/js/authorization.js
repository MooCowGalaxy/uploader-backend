let isLoggedIn = false;

let darkMode = window.localStorage.getItem('dark')
if (darkMode === null) {
    if (window.matchMedia) {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkMode = true
        }
    }
    if (!darkMode) darkMode = false
    window.localStorage.setItem('dark', darkMode)
    if (darkMode) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}

function isDarkMode() {
    return window.localStorage.getItem('dark') === 'true'
}
function setIcon() {
    document.getElementById('navbar-dark').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="${isLoggedIn ? 'block ' : ''}text-white h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    ${isDarkMode() ?
        '<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />' :
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />'}
</svg>`
}
function setListener() {
    let el = document.getElementById('navbar-dark')
    if (el) {
        setIcon()
        el.onclick = () => {
            window.localStorage.setItem('dark', (!isDarkMode()).toString())
            if (isDarkMode()) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
            setIcon()
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    if (isDarkMode()) document.querySelector('html').classList.add('dark')
    setListener()
});

const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};
let isDropdownVisible = false;
function toggleNavbarDropdown() {
    if (!isDropdownVisible) {
        isDropdownVisible = true
        $('.bi-chevron-down').addClass('hidden')
        $('.bi-chevron-up').removeClass('hidden')
        $('#n-dropdown').removeClass('hidden')
    } else {
        isDropdownVisible = false
        $('.bi-chevron-down').removeClass('hidden')
        $('.bi-chevron-up').addClass('hidden')
        $('#n-dropdown').addClass('hidden')
    }
}
function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}

$(document).ready(() => {
    $('.login').click(() => {
        if (!isLoggedIn) {
            if (window.opener === null) {
                window.open('/auth/login', '_blank', 'location=yes,height=750,width=500,scrollbars=yes,status=yes')
            } else {
                window.location.replace('/auth/login')
            }
        } else {
            if (window.opener === null) {
                window.location.replace('/dashboard')
            } else {
                window.opener.location.replace('/dashboard')
                window.close()
            }
        }
    })
})
function setupDropdown() {
    $('#navbar-dropdown').click(() => {
        toggleNavbarDropdown()
    })
    $('body').click((e) => {
        if (e.target.id !== 'navbar-dropdown' && $(e.target).parents('#navbar-dropdown').length === 0) {
            isDropdownVisible = true
            toggleNavbarDropdown()
        }
    })
}
if (document.cookie.length > 0 && document.cookie.includes('token')) {
    $.ajax({
        url: '/api/user',
        method: 'GET',
        error: console.error,
        success: (data) => {
            if (data.success) {
                isLoggedIn = true
                let tag = `${escapeHtml(data.data.username)}<span class="font-light" id="discriminator">#${data.data.discriminator}</span>`
                $(document).ready(() => {
                    if (window.location.pathname.startsWith('/dashboard')) {
                        setupDropdown()
                    } else if (document.getElementById('navbar') !== null) {
                        $('#nav-dropdown').addClass('inline-block')
                        $('#nav-dropdown').html(`
                        <button id="navbar-dark" class="rounded-full mr-2 align-middle inline-block no-transition"></button>
                        <button class="text-white align-middle inline-block" id="navbar-dropdown">${tag} <svg id="navbar-dropdown-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
</svg><svg id="navbar-dropdown-icon-focus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-up hidden" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
</svg></button>
                        <div id="n-dropdown" class="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg py-1 bg-white hidden" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                            <a href="/dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-300" role="menuitem" tabindex="-1">Dashboard</a>
                            <a href="/auth/logout" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-300" role="menuitem" tabindex="-1">Sign out</a>
                        </div>
                    `);
                        setupDropdown()
                        setIcon()
                        setListener()
                    }
                });
            }
        }
    })
}
let isLoggedIn = false;

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
                        $('#nav-dropdown').html(`
                        <button class="text-white" id="navbar-dropdown">${tag} <i class="bi bi-chevron-down" id="navbar-dropdown-icon"></i><i class="bi bi-chevron-up hidden" id="navbar-dropdown-icon-focus"></i></button>
                        <div id="n-dropdown" class="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg py-1 bg-white hidden" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                            <a href="/dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-300" role="menuitem" tabindex="-1">Dashboard</a>
                            <a href="/auth/logout" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-300" role="menuitem" tabindex="-1">Sign out</a>
                        </div>
                    `);
                        setupDropdown()
                    }
                });
            }
        }
    })
}
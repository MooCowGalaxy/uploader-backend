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

function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}

$(document).ready(() => {
    $('#login-button').click(() => {
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
$.ajax({
    url: '/api/user',
    method: 'GET',
    error: console.error,
    success: (data) => {
        if (data.success) {
            isLoggedIn = true
            let tag = escapeHtml(`${data.data.username}#${data.data.discriminator}`)
            $(document).ready(() => {
                if (!window.location.pathname.startsWith('/dashboard') && document.getElementById('navbar') !== null) {
                    $('#nav-dropdown').html(`
                        <button class="text-white" id="navbar-dropdown">${tag} <i class="bi bi-chevron-down" id="navbar-dropdown-icon"></i><i class="bi bi-chevron-up" id="navbar-dropdown-icon-focus"></i></button>
                        <div class="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg py-1 bg-white hidden" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                            <a href="/dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-300" role="menuitem" tabindex="-1">Dashboard</a>
                            <a href="/auth/logout" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-300" role="menuitem" tabindex="-1">Sign out</a>
                        </div>
                    `);
                }
            });
        }
    }
})
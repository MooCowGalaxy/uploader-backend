let onModalButton1Click = []
let onModalButton2Click = []
let route = null;
let user = null;

function closeModal() {
    $('#modal').removeClass('visible')
}
function modalButton1Click() {
    for (let func of onModalButton1Click) {
        try {
            func()
        } catch (e) {
            if (e.constructor !== TypeError) {
                console.error(e)
                break
            }
        }
    }
}
function modalButton2Click() {
    for (let func of onModalButton2Click) {
        try {
            func()
        } catch (e) {
            if (e.constructor !== TypeError) {
                console.error(e)
                break
            }
        }
    }
}
function isSmall() {
    return $('#close-sidebar').width() === 24
}
function openModal({title, description, iconColor, iconSVG, buttons}) {
    $('#modal-title').text(title)
    $('#modal-description').text(description)

    $('#modal-icon').removeClass((index, className) => {
        return (className.match(/(^|\s)bg-\S+/g) || []).join(' ')
    })
    $('#modal-icon').addClass(iconColor)
    $('#modal-icon').html(iconSVG)

    $('#modal-buttons').html(buttons)

    $('#modal').addClass('visible')
}
function unsavedChangesModal({onDiscard, onSaveChanges} = {}) {
    onModalButton1Click = [onDiscard]
    onModalButton2Click = [onSaveChanges]
    if (isSmall()) closeSidebar()
    openModal({
        title: 'You have unsaved changes!',
        description: 'Would you like to discard your changes or save them?',
        iconColor: 'bg-red-100',
        iconSVG: `<svg class="h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>`,
        buttons: `<button id="modal-button-1" onclick="modalButton1Click()" class="px-3 py-2 rounded-lg border border-red-600">Discard</button>
                  <button id="modal-button-2" onclick="modalButton2Click()" class="px-3 py-2 bg-green-400 rounded-lg font-semibold">Save</button>`
    })
}
function openSidebar() {
    $('#sidebar').removeClass('closed')
    $('#sidebar-placeholder').removeClass('closed')
}
function closeSidebar(ignoreTransition = false) {
    if (ignoreTransition) {
        $('#sidebar').addClass('no-transition')
        $('#sidebar-placeholder').addClass('no-transition')
        setTimeout(() => {
            $('#sidebar').addClass('closed')
            $('#sidebar-placeholder').addClass('closed')
            setTimeout(() => {
                $('#sidebar').removeClass('no-transition')
                $('#sidebar-placeholder').removeClass('no-transition')
            }, 1)
        }, 1)
    } else {
        $('#sidebar').addClass('closed')
        $('#sidebar-placeholder').addClass('closed')
    }
}
function setDocument(URL, title = null, push = true) {
    if (title === null) title = document.title
    if (push) window.history.pushState({}, title, `/dashboard${URL}`)
    else window.history.replaceState({}, title, `/dashboard${URL}`)
    document.title = title
    onURLUpdate()
}
function onURLUpdate() {
    checkPath()
}
const routes = {
    '': 'p-home',
    '/': 'r-',
    '/home': 'r-',
    '/user': 'p-user',
    '/settings/user': 'r-/user',
    '/embed': 'p-embed',
    '/settings/embed': 'r-/embed',
    '/gallery': 'p-gallery',
    '/domains': 'p-domains',
    '/donate': 'p-donate'
}
const pages = {
    home: {
        title: 'Home',
        onLoad: () => {
            $.ajax({
                url: '/api/user',
                method: 'GET',
                error: console.error,
                success: data => {
                    if (data.success) {
                        $('#page-home-self-images').html(`<p><b class="font-semibold text-lime-600">${data.user.uploadCount}</b> images uploaded</p>`)
                        $('#page-home-self-storage').html(`<p><b class="font-semibold text-cyan-600">${data.user.bytesHuman}</b> storage used</p>`)
                    }
                }
            })
            $.ajax({
                url: '/api/stats',
                method: 'GET',
                error: console.error,
                success: data => {
                    $('#page-home-global-images').html(`<p><b class="font-semibold text-lime-600">${data.fileCount}</b> images uploaded</p>`)
                    $('#page-home-global-storage').html(`<p><b class="font-semibold text-cyan-600">${data.dataUsed}</b> storage used</p>`)
                    $('#page-home-global-users').html(`<p><b class="font-semibold text-blue-600">${data.userCount}</b> users registered</p>`)
                }
            })
            $.ajax({
                url: '/api/stats/history',
                method: 'GET',
                error: console.error,
                success: data => {
                    let times = []
                    let users = []
                    let bytes = []
                    let images = []
                    for (let row of data) {
                        times.push(new Date(parseInt(row.timestamp) * 1000).toString().split(' ').slice(1, 5).join(' '))
                        users.push(row.users)
                        bytes.push(Math.round(row.bytes_used / 10000) / 100)
                        images.push(row.images_uploaded)
                    }
                    const ctx = document.getElementById(`page-home-chart`)
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: times,
                            datasets: [{
                                label: 'Storage used (MB)',
                                data: bytes,
                                borderColor: '#4287f5',
                                fill: false,
                                yAxisID: 'y'
                            }, {
                                label: 'Images uploaded',
                                data: images,
                                borderColor: '#c9ae02',
                                fill: false,
                                yAxisID: 'y1'
                            }, {
                                label: 'Users',
                                data: users,
                                borderColor: '#c22000',
                                fill: false,
                                yAxisID: 'y2'
                            }]
                        },
                        options: {
                            interaction: {
                                mode: 'index',
                                intersect: false
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'moo.ing statistics'
                                }
                            },
                            stacked: false,
                            scales: {
                                y: {
                                    type: 'linear',
                                    display: true,
                                    position: 'left',
                                    grid: {
                                        drawOnChartArea: true
                                    }
                                },
                                y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    grid: {
                                        drawOnChartArea: false
                                    }
                                },
                                y2: {
                                    type: 'linear',
                                    display: true,
                                    position: 'left',
                                    grid: {
                                        drawOnChartArea: false
                                    }
                                }
                            }
                        },
                        responsive: true,
                        maintainAspectRatio: false
                    })
                }
            })
        },
        html: `
<div class="content">
    <h1>MotD</h1>
    <h2>moo moo</h2>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div class="content">
        <h1>Your Stats</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div class="rounded-md bg-lime-200 bg-opacity-50 py-2 px-3 border-l-4 border-l-lime-400" id="page-home-self-images">
                <p class="text-loading"></p>
            </div>
            <div class="rounded-md bg-cyan-100 bg-opacity-50 py-2 px-3 border-l-4 border-l-cyan-300" id="page-home-self-storage">
                <p class="text-loading"></p>
            </div>
        </div>
    </div>
    <div class="content">
        <h1>Global Stats</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            <div class="rounded-md bg-lime-200 bg-opacity-50 py-2 px-3 border-l-4 border-l-lime-400" id="page-home-global-images">
                <p class="text-loading"></p>
            </div>
            <div class="rounded-md bg-cyan-100 bg-opacity-50 py-2 px-3 border-l-4 border-l-cyan-300" id="page-home-global-storage">
                <p class="text-loading"></p>
            </div>
            <div class="rounded-md bg-blue-100 md:col-span-2 xl:col-span-1 bg-opacity-50 py-2 px-3 border-l-4 border-l-blue-400" id="page-home-global-users">
                <p class="text-loading"></p>
            </div>
        </div>
    </div>
</div>
<div class="content">
    <canvas id="page-home-chart" class="w-full h-full"></canvas>
</div>
`
    },
    user: {
        title: 'User Settings'
    },
    embed: {
        title: 'Embed Settings'
    },
    gallery: {
        title: 'Image Gallery'
    },
    domains: {
        title: 'Domains'
    },
    donate: {
        title: 'Donate'
    }
}
function handlePathCode(path) {
    if (path.startsWith('p-')) {
        let page = path.slice(2)
        if (route === page) return;
        route = page
        $('.page-visible').removeClass('page-visible')
        $(`#page-${page}`).addClass('page-visible')
        $(`#page-${page}`).html(pages[page].html)
        $('.sidebar-item').removeClass('active')
        $(`#sidebar-${page}`).addClass('active')
        $('#page-title').text(pages[page].title)
        if (isSmall()) closeSidebar()
        if (typeof pages[page].onLoad === 'function') pages[path.slice(2)].onLoad()
    } else if (path.startsWith('r-')) {
        setDocument(path.slice(2), null, false)
    }
}
function checkPath() {
    let current = window.location.pathname.slice(10)
    for (let path of Object.keys(routes)) {
        if (path === current) {
            handlePathCode(routes[path])
            return
        }
    }
    setDocument('', null, false)
}

$(document).ready(() => {
    checkPath()
    for (let page of Object.keys(pages)) {
        $(`#sidebar-${page}`).click(() => {
            setDocument(`/${page}`)
        })
    }

    $('#toggle-sidebar-button').click(() => {
        if ($('#sidebar').hasClass('closed')) {
            openSidebar()
        } else {
            closeSidebar()
        }
    })
    $('#close-sidebar').click(() => {
        $('#sidebar').addClass('closed')
        $('#sidebar-placeholder').addClass('closed')
    })
    $('#modal-container').click((e) => {
        e.stopPropagation()
    })
    $('#modal').click(() => {
        $('#modal').removeClass('visible')

    })
    let modal = document.getElementById('modal')
    modal.addEventListener('transitionend', () => {
        if (!$('#modal').hasClass('visible')) {
            $('#modal').css('z-index', '-100')
        }
    }, true)
    modal.addEventListener('transitionrun', () => {
        if ($('#modal').hasClass('visible')) {
            $('#modal').css('z-index', '20')
        }
    })
    if (isSmall()) closeSidebar(true)
})
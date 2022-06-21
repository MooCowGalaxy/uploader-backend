let onModalButton1Click = []
let onModalButton2Click = []
let isModalClosable = true
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
    isModalClosable = true
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
    '/donate': 'p-donate',
    '/rules': 'p-rules'
}
const pages = {
    home: {
        title: 'Home',
        onLoad: () => {
            $('#page-home-self-images').html(`<p><b class="font-semibold text-lime-600">${user.user.uploadCount}</b> images uploaded</p>`)
            $('#page-home-self-storage').html(`<p><b class="font-semibold text-cyan-600">${user.user.bytesHuman}</b> storage used</p>`)
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
                            },
                            responsive: true,
                            maintainAspectRatio: false
                        }
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
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div class="content">
        <h1 class="mb-2">Quickstart Guide</h1>
        <p class="mb-2">Note: This guide is meant for users on Windows using ShareX.</p>
        <div class="grid grid-cols-1 gap-3" id="page-home-quickstart">
            <div class="list-item">
                <p>1.</p>
                <div>Download and install ShareX <a href="https://getsharex.com" class="link" target="_blank" rel="noopener noreferrer">here</a> if you don't have it installed yet.</div>
            </div>
            <div class="list-item">
                <p>2.</p>
                <div>Download your generated ShareX config <a href="/api/config/sharex" class="link" target="_blank" rel="noopener noreferrer">here</a> and open it. Click "yes" to make mooi.ng the default custom uploader.</div>
            </div>
            <div class="list-item">
                <p>3.</p>
                <div>Click on <code>After capture tasks</code> on the left and enable <code>Copy image to clipboard</code>, <code>Save image to file</code> and <code>Upload image to host</code>.</div>
            </div>
            <div class="list-item">
                <p>4.</p>
                <div>Click on <code>After upload tasks</code> on the left and enable <code>Copy URL to clipboard</code>.</div>
            </div>
            <div class="list-item">
                <p>5.</p>
                <div>Done! You can now start sharing screenshots through mooi.ng. You can also customize your mooi.ng experience by changing <a href="/dashboard/embed" class="link">embed</a> or <a href="/dashboard/domains" class="link">domain</a> settings.</div>
            </div>
        </div>
    </div>
    <div class="content">
        <h1>Statistics</h1>
        <div class="max-h-120">
            <canvas id="page-home-chart" class="w-full h-full"></canvas>
        </div>
    </div>
</div>
`
    },
    user: {
        title: 'User Settings',
        onLoad: () => {
            let isAPIKeyVisible = false
            $('#page-user-api-key-view').click(() => {
                if (isAPIKeyVisible) {
                    $('#page-user-api-key').text('*********************')
                    $('#page-user-api-key-view').html(`
<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
</svg>`)
                } else {
                    $('#page-user-api-key').text(user.user.apiKey)
                    $('#page-user-api-key-view').html(`
<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
</svg>`)
                }
                isAPIKeyVisible = !isAPIKeyVisible
            })
            $('#page-user-api-key-regenerate').click(() => {
                onModalButton1Click = [closeModal]
                onModalButton2Click = [() => {
                    isModalClosable = false
                    $('#modal-button-1').prop('disabled', true)
                    $('#modal-button-2').prop('disabled', true)
                    $('#modal-button-2').text('Regenerating...')
                    $.ajax({
                        url: '/api/user/regenerate',
                        method: 'POST',
                        error: console.error,
                        success: (data) => {
                            $('#modal-button-2').text('Regenerated')
                            $('#modal-button-2').removeClass('bg-red-300')
                            $('#modal-button-2').addClass('bg-green-300')
                            setTimeout(() => {
                                isModalClosable = true
                                $('#modal').removeClass('visible')
                            }, 500)
                            user.user.apiKey = data.apiKey
                        }
                    })
                }]
                openModal({
                    title: 'Are you sure?',
                    description: 'If you regenerate your API key, you will need to re-download your configs. Only proceed if you know what you are doing.',
                    iconColor: 'bg-red-100',
                    iconSVG: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
</svg>`,
                    buttons: `<button id="modal-button-1" onclick="modalButton1Click()" class="px-3 py-2 rounded-lg font-semibold bg-slate-200 disabled:opacity-75">Close</button>
                              <button id="modal-button-2" onclick="modalButton2Click()" class="px-3 py-2 rounded-lg bg-red-300 disabled:opacity-75">Regenerate</button>`
                })
            })
        },
        html: `
        <div class="grid grid-cols-1 sm:grid-cols-2">
            <div class="content">
                <h1 class="mb-2">API Key</h1>
                <div class="rounded border border-gray-300 px-4 py-2.5 mb-2 relative">
                    <p id="page-user-api-key">*********************</p>
                    <div class="absolute right-4 top-2.5">
                        <button id="page-user-api-key-view">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div>
                    <button class="px-3 py-1 bg-red-200 hover:bg-red-300 rounded-md float-right" id="page-user-api-key-regenerate">Regenerate</button>
                </div>
            </div>
        </div>
        `
    },
    embed: {
        title: 'Embed Settings',
        onLoad: () => {},
        html: ``
    },
    gallery: {
        title: 'Image Gallery'
    },
    domains: {
        title: 'Domains'
    },
    donate: {
        title: 'Donate'
    },
    rules: {
        title: 'Rules',
        html: `
        <div class="content">
            <h1>Rules</h1> 
            <p class="mb-2">By using mooi.ng, you agree to abiding by the rules listed below. These rules are not exhaustive, and actions are ultimately up to staff discretion.</p>
            <ol class="list-decimal ml-10 mb-2">
                <li>Do not upload NSFW content or gore to the service.</li>
                <li>Do not upload content that illustrates/portrays illegal activities.</li>
                <li>Do not upload malware to the service.</li>
                <li>Do not spam or misuse the service.</li>
                <li>Account sharing is prohibited.</li>
            </ol>
            <p class="mb-2">If you feel that a user has broken the rules above, please send an email to <code>moocow@moocow.dev</code>. Automatic measures are also put in place to prevent the misuse of this service.</p>
        </div>
        `
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
$.ajax({
    url: '/api/user',
    method: 'GET',
    error: console.error,
    success: function (data) {
        user = data
    }
})
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
        if (isModalClosable) $('#modal').removeClass('visible')
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
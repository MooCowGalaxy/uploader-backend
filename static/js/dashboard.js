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
                <div>Open the ShareX app. Click on <code>After capture tasks</code> on the left and enable <code>Copy image to clipboard</code>, <code>Save image to file</code> and <code>Upload image to host</code>.</div>
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
                    buttons: `<button id="modal-button-1" onclick="modalButton1Click()" class="px-3 py-2 rounded-lg font-semibold bg-slate-200 disabled:opacity-75">Cancel</button>
                              <button id="modal-button-2" onclick="modalButton2Click()" class="px-3 py-2 rounded-lg bg-red-300 disabled:opacity-75">Regenerate</button>`
                })
            })
        },
        html: `
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    <div class="content">
        <h1 class="mb-2">ShareX Config</h1>
        <a class="px-4 py-2 bg-sky-500 text-white rounded-md" href="/api/config/sharex" target="_blank" rel="noopener noreferrer">Download</a>
    </div>
</div>
        `
    },
    embed: {
        title: 'Embed Settings',
        onLoad: () => {
            $('#pfp').html(`<img class="rounded-full w-12 h-12" src="https://cdn.discordapp.com/avatars/${user.data.id}/${user.data.avatar}.png?size=64">`)
            $('#page-embed-username').text(user.data.username)
            $('#embed-preview-link').text(`https://${user.user.domain}/aBcD1234.png`)
            let original;
            function setButtonStatus(enabled = false) {
                $('#page-embed-save').prop('disabled', !enabled)
            }
            function getError() {
                let siteName = $('#page-embed-input-site-name').val()
                if (siteName.length > 255) return 'Site name must be 255 characters or less.'
                let title = $('#page-embed-input-title').val()
                if (title.length > 255) return 'Embed title must be 255 characters or less.'
                let description = $('#page-embed-input-description').val()
                if (description.length > 500) return 'Embed description must be 500 characters or less.'
                if ($('#page-embed-embed-toggle').prop('checked') && title === '') return 'There must be a title for the embed to display.'
                return null
            }
            function setPlaceholders(text) {
                let newText = text.replaceAll('[date]', new Date().toUTCString().split(' ').slice(0, 4).join(' '))
                newText = newText.replaceAll('[datetime]', new Date().toUTCString())
                newText = newText.replaceAll('[filesize]', '2.66 MB')
                newText = newText.replaceAll('[name]', 'aBcD1234.png')
                newText = newText.replaceAll('[dimensions]', '256 x 256')
                return newText
            }
            function embedHasChanges() {
                if ($('#page-embed-embed-toggle').prop('checked') !== original.embed.enabled) return true
                if ($('#page-embed-input-site-name').val() !== original.embed.siteName) return true
                if ($('#page-embed-input-title').val() !== original.embed.title) return true
                if ($('#page-embed-input-description').val() !== original.embed.description) return true
                if ($('#page-embed-input-color').val() !== original.color) return true
                return false
            }
            $('#page-embed-save').click(() => {
                if (getError()) return;
                if (!embedHasChanges()) return;
                setButtonStatus(false)
                $('#page-embed-save').html(`<div class="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-gray-300" role="status">
    <span class="visually-hidden">Saving...</span>
  </div>`)
                $.ajax({
                    url: '/api/user/embed',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    data: JSON.stringify({
                        name: $('#page-embed-input-site-name').val(),
                        title: $('#page-embed-input').val(),
                        description: $('#page-embed-input-description').val(),
                        color: $('#page-embed-input-color').val(),
                        enabled: $('#page-embed-embed-toggle').prop('checked')
                    }),
                    error: console.error,
                    success: () => {
                        $('#page-embed-save').text('Saved!')
                        setTimeout(() => {
                            $('#page-embed-save').text('Save Changes')
                            updateData()
                        }, 1500)
                    }
                })
            })
            function updateEmbed() {
                let error = getError()
                if (error) {
                    $('#page-embed-container').css('display', 'none')
                    $('#page-embed-embed-error').text(error)
                    setButtonStatus(false)
                    return
                } else {
                    $('#page-embed-container').css('display', '')
                    $('#page-embed-embed-error').text('')
                }
                if ($('#page-embed-embed-toggle').prop('checked')) {
                    $('#embed').removeClass('hidden')
                    $('#embed-image-only').addClass('hidden')
                    $('.discord-embed-site-name').text(setPlaceholders($('#page-embed-input-site-name').val()))
                    $('.discord-embed-site-title').text(setPlaceholders($('#page-embed-input-title').val()))
                    $('.discord-embed-site-description').text(setPlaceholders($('#page-embed-input-description').val()))
                    $('#embed').css('border-left-color', $('#page-embed-input-color').val())
                } else {
                    $('#embed').addClass('hidden')
                    $('#embed-image-only').removeClass('hidden')
                }
                if (embedHasChanges()) {
                    setButtonStatus(true)
                } else {
                    setButtonStatus(false)
                }
            }
            $('#page-embed-embed-toggle').on('input', updateEmbed)
            $('#page-embed-input-site-name').on('input', updateEmbed)
            $('#page-embed-input-title').on('input', updateEmbed)
            $('#page-embed-input-description').on('input', updateEmbed)
            $('#page-embed-input-color').on('input', updateEmbed)

            function updateData() {
                $.ajax({
                    url: '/api/user/embed',
                    method: 'GET',
                    error: console.error,
                    success: (data) => {
                        if (data.success) {
                            $('#page-embed-embed-toggle').prop('checked', !!data.data.embed.enabled)
                            $('#page-embed-input-site-name').val(data.data.embed.siteName !== undefined ? data.data.embed.siteName : '')
                            $('#page-embed-input-title').val(data.data.embed.title !== undefined ? data.data.embed.title : '')
                            $('#page-embed-input-description').val(data.data.embed.description !== undefined ? data.data.embed.description : '')
                            $('#page-embed-input-color').val(data.data.color !== undefined ? data.data.color : '#000000')
                            original = data.data
                            updateEmbed()
                        }
                    }
                })
            }
            updateData()
        },
        html: `
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="content">
        <h1 class="mb-2">Embed Builder</h1>
        <div class="flex justify-start mb-2">
            <div class="form-check form-switch">
                <input class="form-check-input appearance-none w-9 -ml-10 rounded-full float-left h-5 align-top bg-white bg-no-repeat bg-contain bg-gray-300 focus:outline-none cursor-pointer shadow-sm" type="checkbox" role="switch" id="page-embed-embed-toggle">
                <label class="form-check-label inline-block text-gray-800" for="page-embed-embed-toggle">Enable embeds</label>
            </div>
        </div>
        <div class="accordion mb-4" id="placeholder-accordion">
            <div class="accordion-item bg-white border border-gray-200">
                <h2 class="accordion-header mb-0" id="placeholder-accordion-heading">
                    <button class="accordion-button relative flex items-center w-full py-4 px-5 text-base text-gray-800 text-left bg-white border-0 rounded-none transition focus:outline-none" type="button" data-bs-toggle="collapse" data-bs-target="#placeholder-accordion-content" aria-expanded="true" aria-controls="placeholder-accordion-content">
                        Placeholders
                    </button>
                </h2>
                <div id="placeholder-accordion-content" class="accordion-collapse collapse show" aria-labelledby="placeholder-accordion-heading" data-bs-parent="#placeholder-accordion">
                    <div class="accordion-body py-4 px-5">
                        <code>[date]</code> - Displays the UTC date when the image was uploaded.<br>
                        <code>[datetime]</code> - Displays the UTC date and time when the image was uploaded.<br>
                        <code>[filesize]</code> - Displays a human-readable format of the image size.<br>
                        <code>[name]</code> - Displays the name of the image.<br>
                        <code>[dimensions]</code> - Displays the dimensions of the image.
                    </div>
                </div>
            </div>
        </div>
        <div>
            <div class="flex justify-start">
                <div class="mb-3 w-full">
                    <label for="page-embed-input-site-name" class="form-label inline-block mb-1 text-gray-700 font-semibold">Site Name</label>
                    <input type="text" class="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" id="page-embed-input-site-name" placeholder="Site name" />
                </div>
            </div>
            <div class="flex justify-start">
                <div class="mb-3 w-full">
                    <label for="page-embed-input-title" class="form-label inline-block mb-1 text-gray-700 font-semibold">Site Title</label>
                    <input type="text" class="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" id="page-embed-input-title" placeholder="Site title" />
                </div>
            </div>
            <div class="flex justify-start">
                <div class="mb-3 w-full">
                    <label for="page-embed-input-description" class="form-label inline-block mb-1 text-gray-700 font-semibold">Site Description</label>
                    <input type="text" class="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" id="page-embed-input-description" placeholder="Site description" />
                </div>
            </div>
            <div class="flex justify-start">
                <div class="mb-5 w-full">
                    <label for="page-embed-input-color" class="form-label inline-block mb-1 text-gray-700 font-semibold">Embed Color</label>
                    <input type="color" class="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" id="page-embed-input-color" placeholder="Embed color" />
                </div>
            </div>
            <div class="flex justify-end">
                <button id="page-embed-save" class="px-4 py-2 bg-green-400 rounded-md disabled:opacity-75 disabled:bg-gray-300" disabled>Save Changes</button>
            </div>
        </div>
    </div>
    <div class="content">
        <h1 class="mb-2">Embed Preview</h1>
        <div class="discord-embed-container p-5 d-flex-row" id="page-embed-container">
            <div class="discord-embed-profile pr-3 flex-initial" id="pfp"></div>
            <div class="discord-embed-content flex-1">
                <div class="discord-embed-username select-none">
                    <h1 class="text-white font-semibold inline mr-1" id="page-embed-username"></h1>
                    <p class="text-gray-400 text-xs inline">Today at ${new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
                </div>
                <p class="text-sky-500 hover:underline" id="embed-preview-link"></p>
                <div class="discord-embed-preview" id="embed">
                    <div>
                        <span class="discord-embed-site-name"></span>
                    </div>
                    <div>
                        <span class="discord-embed-site-title"></span>
                    </div>
                    <div>
                        <span class="discord-embed-site-description"></span>
                    </div>
                    <div class="w-full sm:max-w-3xl">
                        <img src="/static/img/SXL.png" alt="">
                    </div>
                </div>
                <div id="embed-image-only" class="max-w-3xl hidden"><img src="/static/img/SXL.png" alt=""></div>
            </div>
        </div>
        <p class="text-red-600" id="page-embed-embed-error"></p>
    </div>
</div>
        `
    },
    gallery: {
        title: 'Image Gallery',
        onLoad: () => {
            let sort = 0
            let page = 0
            function fallbackCopyTextToClipboard(text) {
                let textArea = document.createElement("textarea")
                textArea.value = text
                textArea.style.top = "0"
                textArea.style.left = "0"
                textArea.style.position = "fixed"

                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()

                try {
                    document.execCommand('copy')
                } catch {}

                document.body.removeChild(textArea)
            }
            function copyTextToClipboard(text) {
                if (!navigator.clipboard) {
                    fallbackCopyTextToClipboard(text)
                    return
                }
                navigator.clipboard.writeText(text).then().catch(console.error)
            }
            $('#sort').on('input', () => {
                sort = $('#sort').val()
                page = 0
                $('#image-gallery-container').empty()
                loadMore()
            })

            function loadMore() {
                $('#load-more').prop('disabled', true)
                $('#load-more').text('Loading...')
                let oldScroll = $(window).scrollTop()
                page++;
                $.ajax({
                    url: `/api/user/images?page=${page}&sort=${sort}`,
                    method: 'GET',
                    error: console.error,
                    success: (data) => {
                        page = data.pages.page
                        $('#load-more').prop('disabled', false)
                        $('#load-more').text('Load More')
                        if (data.pages.limit === page) {
                            $('#load-more').addClass('hidden')
                        } else {
                            $('#load-more').removeClass('hidden')
                        }
                        for (let image of data.data) {
                            $('#image-gallery-container').append(`
<div class="content" id="i-${image.fileId}">
    <p class="text-center font-semibold">${image.fileId}.${image.extension}</p>
    <img src="/raw/${image.fileId}.${image.extension}" alt="" class="mx-auto w-auto max-w-full max-h-40 mb-3 rounded-md object-contain">
    <p class="mb-3 text-center">${new Date(parseInt(image.timestamp)).toLocaleString()}<br>${humanReadableBytes(parseInt(image.size))} - viewed ${image.viewCount} times</p>
    <div class="inline-block mx-auto text-center">
        <button class="bg-sky-600 rounded-md pl-3 px-4 py-2 text-white mb-1" id="i-${image.fileId}-copy">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 -translate-y-0.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy Link
        </button>
        <button class="bg-green-600 rounded-md pl-3 px-4 py-2 text-white mb-1" id="i-${image.fileId}-download">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 -translate-y-0.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
        </button>
        <button class="bg-red-600 rounded-md pl-3 px-4 py-2 text-white mb-1 disabled:opacity-75" id="i-${image.fileId}-delete">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 -translate-y-0.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
        </button>
    </div>
</div>`)
                            $(`#i-${image.fileId}-copy`).click(() => {
                                copyTextToClipboard(`https://${image.domain}/${image.fileId}.${image.extension}`)
                                $(`#i-${image.fileId}-copy`).html(`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 -translate-y-0.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg> &nbsp;&nbsp;&nbsp;Copied!&nbsp;&nbsp;`)
                                setTimeout(() => {$(`#i-${image.fileId}-copy`).html(`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 -translate-y-0.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg> Copy Link`)}, 1500)
                            })
                            $(`#i-${image.fileId}-download`).click(() => {
                                console.log('h')
                                let link = document.createElement("a")
                                link.download = `${image.fileId}.${image.extension}`
                                link.href = `/raw/${image.fileId}.${image.extension}`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                            })
                            $(`#i-${image.fileId}-delete`).click(() => {
                                $(`#i-${image.fileId}-delete`).text('Deleting...')
                                $(`#i-${image.fileId}-delete`).prop('disabled', true);
                                $.ajax({
                                    url: `/api/user/image/delete/${image.fileId}`,
                                    method: 'POST',
                                    error: console.error,
                                    success: () => {
                                        $(`#i-${image.fileId}`).remove()
                                    }
                                })
                            })
                        }
                        $(document).scrollTop(oldScroll)
                    }
                })
            }
            $('#load-more').click(loadMore)
            loadMore()
            function humanReadableBytes(bytes = 0) {
                if (bytes >= 1000 * 1000 * 1000 * 1000) {
                    return `${Math.round(bytes / (1000 * 1000 * 1000 * 10)) / 100} TB`
                }
                if (bytes >= 1000 * 1000 * 1000) {
                    return `${Math.round(bytes / (1000 * 1000 * 10)) / 100} GB`
                }
                if (bytes >= 1000 * 1000) {
                    return `${Math.round(bytes / (1000 * 10)) / 100} MB`
                } else if (bytes >= 1000) {
                    return `${Math.round(bytes / 10) / 100} KB`
                } else {
                    return `${bytes} B`
                }
            }
        },
        html: `
<div class="content d-flex-row">
    <div class="mb-3 xl:w-96">
    <label for="sort">Sort by:</label>
    <select id="sort" class="form-select appearance-none block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding bg-no-repeat border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none">
        <option value="0">Date (new to old)</option>
        <option value="1">Date (old to new)</option>
        <option value="2">File name (A-Z)</option>
        <option value="3">File name (Z-A)</option>
        <option value="4">File size (small to large)</option>
        <option value="5">File size (large to small)</option>
    </select>
  </div>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="image-gallery-container">
    
</div>
<button class="bg-gray-200 px-4 py-2 rounded-md disabled:opacity-75 hidden" id="load-more">Load More</button>
`
    },
    domains: {
        title: 'Domains',
        onLoad: () => {
            if (user.user.domain.endsWith('is-trolli.ng')) {
                $('#page-domains-subdomain').val(user.user.domain !== 'is-trolli.ng' ? user.user.domain.slice(0, -13) : '')
            }
            $('#page-domains-subdomain').on('input', () => {
                let subdomain = $('#page-domains-subdomain').val()
                if (subdomain.length > 20 || subdomain.length === 0) {
                    $('#page-domains-error').text('Subdomain must be between 1 and 20 characters.')
                    $('#page-domains-save').prop('disabled', true)
                    return
                }
                let allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('')
                for (let character of subdomain) {
                    if (!allowed.includes(character)) {
                        $('#page-domains-error').text('Subdomain can only include alphanumeric characters.')
                        $('#page-domains-save').prop('disabled', true)
                        return
                    }
                }
                $('#page-domains-save').prop('disabled', false)
            })
            $('#page-domains-save').click(() => {
                $('#page-domains-save').prop('disabled', true)
                $('#page-domains-save').text('Saving...')
                $.ajax({
                    url: '/api/user/domains',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({subdomain: $('#page-domains-subdomain').val()}),
                    error: () => {
                        $('#page-domains-save').text('Save')
                        $('#page-domains-error').text('That subdomain is already taken.')
                    },
                    success: () => {
                        $('#page-domains-save').text('Saved!')
                        setTimeout(() => {
                            $('#page-domains-save').text('Save')
                            $('#page-domains-save').prop('disabled', false)
                        }, 1000)
                    }
                })
            })
        },
        html: `
<div class="content">
    <h1>Your Domain Settings</h1>
    <div class="flex justify-start">
        <div class="max-w-3xl">
            <input type="text" class="form-control inline-block px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded-l transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" id="page-domains-subdomain" placeholder="Subdomain" />
            <span class="inline-block px-3 py-1.5 -translate-x-1 text-base font-normal text-gray-700 bg-gray-200 bg-clip-padding border border-solid border-gray-300 rounded-r">.is-trolli.ng</span>
        </div>
    </div>
    <p class="mb-1 text-red-600" id="page-domains-error"></p>
    <button id="page-domains-save" class="bg-green-300 px-4 py-2 rounded-md mb-3 disabled:opacity-75" disabled>Save</button>
    <p>More options will be available in the future!</p>
</div>
`
    },
    donate: {
        title: 'Donate',
        html: `Nothing to see here...`
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
        changes = {}
        $('.page-visible').html('');
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
    }
})
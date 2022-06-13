$.ajax('/api/stats', {
    method: 'GET',
    success: (data) => {
        $(document).ready(() => {
            $('#users').removeClass();
            $('#users').text(data.userCount);
            $('#storage').removeClass();
            $('#storage').text(data.dataUsed);
            $('#uploads').removeClass();
            $('#uploads').text(data.fileCount);
        })
    }
});
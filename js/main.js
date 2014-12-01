$(function(){
    $('#search').click(function(){

        var query = $('#q').val()

        $.get('http://localhost:9200/sdm/_search', {
            q: query
        }, function(resp){
            console.log(resp)
        }, 'jsonp')

    })
})

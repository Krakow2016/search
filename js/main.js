$(function(){
    $('.search').click(function(){

        var q = $('#name').val()

        var query = {
            query: {
                match: {
                    _all: q
                }
            },
            highlight : {
                fields : {
                    experience: {},
                    interests: {}
                }
            }
        }

        var username = $('#login').val()
        var password = $('#pass').val()

        $.ajax({
            url: "http://146.148.121.30:9200/sdm/_search",
            headers: { "Authorization": "Basic " + btoa(username + ":" + password) },
            type: "POST",
            data: JSON.stringify(query),
            contentType: 'application/json',
        }).then(function(resp){
            $('#log_in').modal('hide')
            var results = []
            resp.hits.hits.forEach(function(hit){
                var model = new Model(hit)
                results.push(new Result({model: model}).render().el)
            })
            $('.results > .row > div:first-child').html(results)
        }).fail(function(){
            $('#log_in').modal('show')
        })

    })

    var Model = Backbone.Model.extend({
        display_name: function() {
            var source = this.get('_source')
            return [source.first_name, source.last_name].join(' ')
        },
        highlights: function() {
            var all = this.get('highlight')
            var result = []
            return _.map(_.values(all), function(hl){
                return hl.join(', ')
            }).join(' &hellip; ')
        },
        email: function() { return this.get('_source').email },
        experience: function() { return this.get('_source').experience },
        interests: function() { return this.get('_source').interests }
    })

    var Details = Backbone.View.extend({
        el: '#details',
        template: _.template("<ul><li>name: <%= display_name() %></li><li>email: <%= email() %></li><li>exp: <%= experience() %></li><li>interests: <%= interests() %></li></ul>"),
        render: function() {
            this.$el.html(this.template(this.model))
        }
    })
    var details = new Details()

    var timeout
    var Result = Backbone.View.extend({
        className: 'result',
        template: _.template("<a href='#'><%= display_name() %></a><div><%= highlights() %></div>"),
        initialize: function() { },
        render: function() {
            console.log(this.model)
            this.$el.html(this.template(this.model))
            return this
        },
        events: {
            'mouseover': 'details',
            'mouseout': 'close'
        },
        details: function() {
            clearTimeout(timeout)
            details.model = this.model
            details.render()
        },
        close: function() {
            clearTimeout(timeout)
            timeout = setTimeout(function() {
                details.$el.empty()
            }, 1000)
        }
    })
})

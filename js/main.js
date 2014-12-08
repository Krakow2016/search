$(function(){
    $('#search').click(function(){

        var q = $('#q').val()

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

        $.ajax({
            url: "http://146.148.121.30:9200/sdm/_search",
            type: "POST",
            data: JSON.stringify(query),
            contentType: 'application/json',
        }).then(function(resp){
            var results = []
            resp.hits.hits.forEach(function(hit){
                var model = new Model(hit)
                results.push(new Result({model: model}).render().el)
            })
            $('.results > .row > div:first-child').html(results)
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
            clearTimeout(this.timeout)
            details.model = this.model
            details.render()
        },
        close: function() {
            clearTimeout(this.timeout)
            this.timeout = setTimeout(function() {
                details.$el.empty()
            }, 1000)
        }
    })
})

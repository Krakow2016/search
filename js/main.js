$(function(){
    var search = function(){

        var name      = $('#name').val()
        var email     = $('#email').val()
        var address   = $('#address').val()
        var parish    = $('#parish').val()
        var age_from  = parseInt($('#age-from').val())
        var age_to    = parseInt($('#age-to').val())

        var education = $('#education').val()
        var studies   = $('#studies').val()
        var languages
        var interests = $('#interests').val()

        var query = {
            query : {
                filtered : {
                    query: {
                        bool: {
                            should: [
                                { match: { first_name: name } },
                                { match: { last_name: name } },
                                { match: { email: email } },
                                { match: { address: address } },
                                { match: { address2: address } },
                                { match: { parish: parish } },
                                { match: { education: education } },
                                { match: { study_field: studies } },
                                { match: { interests: interests } },
                                { match: { experience: interests } }
                            ],
                        },
                    },
                    filter : { }
                }
            },
            //explain: true,
            highlight : {
                fields : {
                    experience: {},
                    interests: {}
                }
            }
        }

        // Uczestnictwo w poprzednich Światowych Dniach Młodzieży
        var wyds = $('[name=wyd]:checked')
        if(wyds.length) {
            query.query.filtered.filter.and = []
            wyds.each(function(i, wyd){
                query.query.filtered.filter.and.push({
                    exists: { field: 'previous_wyd.'+wyd.value }
                })
            })
        }

        if(age_from || age_to) {
            var today = new Date()
            var range = {
                range: {
                    birth_date: {} }}

            if(age_from)
                range.range.birth_date.lte = new Date(new Date().setMonth(today.getMonth() - 12*(age_from-1)))
            if(age_to)
                range.range.birth_date.gte = new Date(new Date().setMonth(today.getMonth() - 12*age_to))

            if(query.query.filtered.filter.and) {
              query.query.filtered.filter.and.push(range)
            } else {
              query.query.filtered.filter.and = [range]
            }
        }

        var username = $('#login').val()
        var password = $('#pass').val()

        var params = {
            url: "http://146.148.121.30:9200/sdm/_search",
            type: "POST",
            data: JSON.stringify(query),
            contentType: 'application/json',
        }

        if(username && password) {
            params['headers'] = { "Authorization": "Basic " + btoa(username + ":" + password) }
        }

        $.ajax(params).then(function(resp){
            $('#log_in').modal('hide')
            var results = []
            resp.hits.hits.forEach(function(hit){
                var model = new Model(hit)
                results.push(new Result({model: model}).render().el)
            })
            $('.results > .row > div:first-child').html(results)
        }).fail(function(e){
            if(e.statusCode === 401) {
                $('#log_in').modal('show')
            } else {
                console.log(e)
            }
        })

    }

    $('.search-form input').keypress(function(e) {
        if (e.which == 13) {
            search()
        }
    })

    $('.search').click(search)

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

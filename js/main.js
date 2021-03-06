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

        var departments = $('#departments').val()
        var comments = $('#comments').val()

        var query = {
            size: 100,
            query : {
                function_score: {
                    query : {
                        filtered : {
                            query: {
                                bool: {
                                    should: [
                                        { bool: {
                                            should: [
                                                { match: { first_name: name } },
                                                { match: { last_name: name } },
                                            ]
                                        }},
                                        { match: { email: email } },
                                        { match: { address: address } },
                                        { match: { address2: address } },
                                        { match: { parish: parish } },
                                        { match: { education: education } },
                                        { match: { study_field: studies } },
                                        { match: { departments: departments } },
                                        { match: { comments: comments } },
                                        { bool: {
                                            should: [
                                                { match: { interests: interests } },
                                                { match: { experience: interests } }
                                            ]
                                        }}
                                    ],
                                    must: []
                                },
                            },
                            filter : { },
                        }
                    },
                    functions: [],
                    score_mode: "avg"
                }
            },
            //explain: true,
            highlight : {
                fields : {
                    experience: {},
                    interests: {},
                    departments: {},
                    comments: {}
                }
            }
        }

        // Jęzkyki
        var langs = $('[name=language]:checked')
        langs.each(function(i, lang){
            var range = {}
            range['languages.'+lang.value+'.level'] = { gte: 1, lte: 10 }
            query.query.function_score.query.filtered.query.bool.must.push({range: range})
            query.query.function_score.functions.push({
                field_value_factor: {
                    "field" : "languages."+lang.value+".level",
                    "modifier" : "square"
                }
            })
        })
        if($('#other_val').val()) {
            var val = $('#other_val').val()
            var range = {}
            range['languages.'+val+'.level'] = { gte: 1, lte: 10 }
            query.query.function_score.query.filtered.query.bool.must.push({range: range})
            query.query.function_score.functions.push({
                field_value_factor: {
                    "field" : "languages."+val+".level",
                    "modifier" : "square"
                }
            })
        }

        // Uczestnictwo w poprzednich Światowych Dniach Młodzieży
        var wyds = $('[name=wyd]:checked')
        if(wyds.length) {
            query.query.function_score.query.filtered.filter.and = []
            wyds.each(function(i, wyd){
                query.query.function_score.query.filtered.filter.and.push({
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
            url: "http://52.28.75.173:3000/sdm/_search",
            type: "POST",
            data: JSON.stringify(query),
            contentType: 'application/json',
        }

        $('#form').attr('action', params.url.replace("http://", "http://"+username+":"+password+"@"))

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
            $('#results-count').text(resp.hits.total)

            if(resp.hits.total) {
                $('.results-header').show()
            }
        }).fail(function(e){
            if(e.status === 401) {
                $('#log_in').modal('show')
            } else {
                alert('Brak połączenia z bazą danych :(')
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

    $('#form').submit(search)

    var stars = {
        0: '&#9734;&#9734;&#9734;&#9734;&#9734;',
        2: '&#9733;&#9734;&#9734;&#9734;&#9734;',
        4: '&#9733;&#9733;&#9734;&#9734;&#9734;',
        6: '&#9733;&#9733;&#9733;&#9734;&#9734;',
        8: '&#9733;&#9733;&#9733;&#9733;&#9734;',
        10: '&#9733;&#9733;&#9733;&#9733;&#9733;' }

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
        interests: function() { return this.get('_source').interests },
        parish: function() { return this.get('_source').parish },
        address: function() { return this.get('_source').address },
        phone: function() { return this.get('_source').mobile },
        birth: function() { return this.get('_source').birth_date },
        age: function() {
            if (this.birth()) {
                return "("+(new Date().getYear() - new Date(this.birth()).getYear())+" lat)"
            }
        },
        studies: function() { return this.get('_source').study_field },
        education: function() { return this.get('_source').education },
        departments: function() { return this.get('_source').departments },
        availability: function() { return this.get('_source').availability },
        languages: function() {
            return _.map(this.get('_source').languages, function(level, lang) {
                return lang+": "+stars[level.level]
            }).sort().join(', ')
        },
        comments: function() { return this.get('_source').comments },
    })

    var timeout

    var Details = Backbone.View.extend({
        el: '#details',
        template: _.template($('#details-template').html()),
        render: function() {
            this.$el.html(this.template(this.model))

            var height = this.$el.height()
            var top = $('#details').parent().offset().top
            var scroll = window.scrollY

            if (top < scroll) { // top not visible
                $('#details').css('top', scroll-top)
            } else {
                $('#details').css('top', 0)
            }
        },
        events: {
            'mouseover': 'details',
            'mouseout': 'close',
            'click .print': 'print',
            'click .email': 'email'
        },
        print: function() {
            window.print()
        },
        details: function() {
            clearTimeout(timeout)
        },
        close: function() {
            clearTimeout(timeout)
            timeout = setTimeout(function() {
                details.$el.empty()
            }, 1000)
        },
        email: function(e) {
            var target = $(e.target)
            target.attr('href', target.attr('href')+'&body='+encodeURIComponent(this.$el.text()))
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
            'mouseout': 'close',
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

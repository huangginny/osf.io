;(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['knockout', 'jquery', 'knockoutpunches', 'History', 'osfutils'], factory);
    } else {
        global.Search  = factory(ko, jQuery, History);
    }
}(this, function(ko, $, History) {
    // Enable knockout punches
    ko.punches.enableAll();

    //https://stackoverflow.com/questions/7731778/jquery-get-query-string-parameters
    function qs(key) {
        key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, '\\$&'); // escape RegEx meta chars
        var match = location.search.match(new RegExp('[?&]'+key+'=([^&]+)(&|$)'));
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    var Category = function(categoryName, categoryCount, alias){
        var self = this;
        self.name = ko.observable(categoryName.charAt(0).toUpperCase() + categoryName.slice(1));

        self.count = ko.observable(categoryCount);
        self.rawName = ko.observable(categoryName);
        self.alias = ko.observable(alias);

        self.getAlias = ko.computed(function() {
            if (self.name() === 'Total')
                return '';
            return ' AND category:' + self.alias();
        });
    };

    var Tag = function(tagInfo){
        var self = this;
        self.name = ko.observable(tagInfo.key);
        self.count = ko.observable(tagInfo.doc_count);
    };

    var ViewModel = function(url, appURL) {
        var self = this;

        self.searchStarted = ko.observable(false);
        self.queryUrl = url;
        self.appURL = appURL;
        self.category = ko.observable({});
        self.alias = ko.observable('');
        self.totalResults = ko.observable(0);
        self.resultsPerPage = ko.observable(10);
        self.currentPage = ko.observable(1);
        self.query = ko.observable('');
        self.results = ko.observableArray([]);
        self.searching = ko.observable(false);
        self.startDate = ko.observable(Date.now());
        self.endDate = ko.observable(Date('1970-01-01'));
        self.categories = ko.observableArray([]);
        self.tags = ko.observableArray([]);
        self.tag = ko.observable('');
        self.calledBySearch = false;

        self.totalCount = ko.computed(function() {
            var theCount = 0;
            $.each(self.categories(), function(index, category) {
                if(category.name() !== 'Total'){
                    theCount += category.count();
                }
            });
            return theCount;
        });

        self.totalPages = ko.computed(function() {
            if(self.totalResults() === 0){
                self.totalResults(self.totalCount());
            }
            var pageCount = 1;
            var resultsCount = Math.max(self.resultsPerPage(),1); // No Divide by Zero
            pageCount = Math.ceil(self.totalResults() / resultsCount);
            return pageCount;
        });

        self.nextPageExists = ko.computed(function() {
            return ((self.totalPages() > 1) && (self.currentPage() < self.totalPages()));
        });

        self.prevPageExists = ko.computed(function() {
            return self.totalPages() > 1 && self.currentPage() > 1;
        });

        self.currentIndex = ko.computed(function() {
            return Math.max(self.resultsPerPage() * (self.currentPage()-1),0);
        });

        self.navLocation = ko.computed(function() {
            return 'Page ' + self.currentPage() + ' of ' + self.totalPages();
        });

        self.queryObject = ko.computed(function(){
            return {
                'query_string': {
                    'default_field': '_all',
                    'query': self.query() + self.alias(),
                    'analyze_wildcard': true,
                    'lenient': true
                }
            };
        });

        self.dateFilter = ko.computed(function() {
            return {
                'range': {
                    'consumeFinished': {
                        'gte': self.startDate(),
                        'lte': self.endDate()
                    }
                }
            };
        });
        self.fullQuery = ko.computed(function() {
            return {
                'filtered': {
                    'query': self.queryObject()
//                    'filter': self.dateFilter()
                }
            };
        });

        self.sortCategories = function(a, b) {
            if(a.name() === 'Total') {
                return -1;
            } else if (b.name() === 'Total'){
                return 1;
            }
                return a.count() >  b.count() ? -1 : 1;
        };

        self.claim = function(mid) {
            claimURL = self.appURL + 'metadata/' + mid + '/promote/';
            $.osf.postJSON(claimURL, {category: 'project'}).success(function(data) {
                window.location = data.url;
            });
        };

        self.help = function() {
            bootbox.dialog({
                title: 'Search help',
                message: '<h4>Queries</h4>'+
                    '<p>Search uses the <a href="http://extensions.xwiki.org/xwiki/bin/view/Extension/Search+Application+Query+Syntax#HAND">Lucene search syntax</a>. ' +
                    'This gives you many options, but can be very simple as well. ' +
                    'Examples of valid searches include:' +
                    '<ul><li><a href="/search/?q=repro*">repro*</a></li>' +
                    '<li><a href="/search/?q=brian+AND+title%3Amany">brian AND title:many</a></li>' +
                    '<li><a href="/search/?q=tags%3A%28psychology%29">tags:(psychology)</a></li></ul>' +
                    '</p>'
            });
        };

        self.filter = function(alias) {
            self.category(alias);
            self.alias(alias.getAlias());
            self.search();
        };

        self.addTag = function(name) {
            self.query(self.query() + ' AND tags:("' + name.name() + '")');
            self.search();
        };

        self.submit = function() {
            self.searchStarted(false);
            self.totalResults(0);
            self.currentPage(1);
            self.search();
        };

        self.search = function(calledByChange) {
            var jsonData = {'query': self.fullQuery(), 'from': self.currentIndex(), 'size': self.resultsPerPage()};
            $.osf.postJSON(self.queryUrl , jsonData).success(function(data) {
                var state = {
                    query: self.query(),
                    page: self.currentPage(),
                    scrollTop: $(window).scrollTop(),
                };

                var url = '?q=' + self.query();

                if (self.category().alias !== undefined && self.category().alias() !== undefined) {
                    url += ('&filter=' + self.category().alias());
                    state.filter = self.category().alias();
                } else {
                    state.filter = '';
                }

                self.results.removeAll();
                self.tags([]);

                data.results.forEach(function(result){
                    self.results.push(result);
                });


                self.categories.removeAll();
                var categories = data.counts;
                $.each(categories, function(key, value){
                    if (value === null) {
                        value = 0;
                    }
                    self.categories.push(new Category(key, value, data.typeAliases[key]));
                });
                self.categories(self.categories().sort(self.sortCategories));

                if (self.category().name !== undefined) {
                    self.totalResults(data.counts[self.category().rawName()]);
                }
                else {
                    if(self.totalCount()) {
                        self.totalResults(self.totalCount());
                    }
                     else {
                        self.totalResults(0);
                    }
                }
                $.each(data.tags, function(key, value){
                    self.tags.push(new Tag(value));
                });
                self.categories()[0].count(self.totalCount());
                self.searchStarted(true);

                url += ('&page=' + self.currentPage());

                if (calledByChange === undefined)
                    self.calledBySearch = true;
                else
                    self.calledBySearch = calledByChange;

                History.pushState(state, 'OSF | Search', url);


            }).fail(function(){
                console.log('error');
                self.totalResults(0);
                self.currentPage(0);
                self.results.removeAll();
            });

        };

        self.paginate = function(val) {
            window.scrollTo(0, 0);
            self.currentPage(self.currentPage()+val);
            self.search();
        };

        self.pagePrev = self.paginate.bind(self, -1);
        self.pageNext = self.paginate.bind(self, 1);

        self.pageChange = function() {
            if (self.calledBySearch) {
                self.calledBySearch = false;
                return;
            }

            self.calledBySearch = false;

            var state = History.getState().data;
            self.currentPage(state.page || 1);
            self.setCategory(state.filter);
            self.query(state.query || '');
            self.search(false);
        };

        self.setCategory = function(cat) {
            if (cat !== undefined && cat !== null && cat !== '') {
                self.category(new Category(cat, cat, cat));
                self.alias(self.category().getAlias());
            } else {
                self.category({});
                self.alias('');
            }
        };

    };

    function Search(selector, url, appURL) {
        // Initialization code
        var self = this;

        self.viewModel = new ViewModel(url, appURL);
        History.Adapter.bind(window, 'statechange', self.viewModel.pageChange);

        var data = {
            query: qs('q'),
            page: Number(qs('page')),
            scrollTop: 0,
            filter: qs('filter')
        };
        History.replaceState(data, 'OSF | Search', location.search);
        self.viewModel.pageChange();
        // self.viewModel.search(true);

        $.osf.applyBindings(self.viewModel, selector);
    }

    return Search;

}));

//Voting application
//Basic JS version

//we scope everything
(function ($) {
    var makeSlug = function (text) {
        var slugcontentHyphens = text.replace(/\s/g, '-');
        var finishedslug = slugcontentHyphens.replace(/[^a-zA-Z0-9\-]/g, '');

        return finishedslug;
    }

    $.fn.VoteNow = function (options) {
        // Create some defaults, extending them with any options that were provided
        var settings = $.extend({
            inputContainerClass: "InputContainer",
            listContainerClass: "ListContainer",
            searchContainerClass: "SearchContainer",
            baseUrl: "/", //default url
            dispatcher: function() { return { dispatch: function(eventName, eventObject) {} }} //interface definition
        }, options);

        var transport = settings.transport;
        var dispatcher = settings.dispatcher;

        var errorHandler = function (xhr, ajaxOptions, thrownError) { 
            dispatcher.dispatch('error', {status:xhr.status, response:thrownError}); 
            console.log(thrownError); 
        };
        var list = null;
        var host = this;
        var ideas = []; //for look up (sockets etc.)

        var methods = {
            init: function (parentContainer) {
                list = $.el.ul({'class':'unstyled'});

                var listContainer = 
                    $.el.div({'class':settings.listContainerClass + ' container-fluid'},
                        list //list child
                    );

                var inputContainer = $.el.div({'class':settings.inputContainerClass + " form-inline container-fluid well"});

                //add input field
                var input = 
                    $.el.input(
                        { 'type': 'text', 
                          'class': 'span5',
                          'placeholder': 'Your idea...',
                          'tabindex': 10,
                          'required': 'required'
                        }
                    );
                
                $(input).validate({expression: "if(VAL != '') return true; else return false;",
                    message: "Field is required.", live: true});

                var leftContainer = 
                    $.el.div({'class':'row span5 LeftInputContainer'},
                        input
                    );

                //add keywords field
                var keywordsInput = document.createElement("input");
                $(keywordsInput).attr("type", "text");
                keywordsInput.className = "span5 KeywordsInput";
                $(keywordsInput).attr("placeholder", "... and your keywords");
                $(keywordsInput).attr('tabindex', 20);
                leftContainer.appendChild(keywordsInput);

                inputContainer.appendChild(leftContainer);

                //add description field
                var description = document.createElement("textarea");
                description.className = "span6";
                $(description).attr("placeholder", "... and your description.");
                $(description).attr('tabindex', 15);
                inputContainer.appendChild(description);

                //private flag
                var privateFlagLabel = document.createElement('label');
                privateFlagLabel.className = "checkbox PrivateLabel";
                var privateFlag = document.createElement('input');
                $(privateFlag).attr('type', 'checkbox');
                privateFlagLabel.appendChild(privateFlag);
                privateFlagLabel.innerHTML += "Private";

                //add submit field
                var submit = document.createElement("input");
                submit.className = "btn btn-primary";
                $(submit).attr("type", "submit");
                $(submit).attr('tabindex', 25);

                inputContainer.appendChild(submit);
                inputContainer.appendChild(privateFlagLabel);

                //collapse button
                var collapseButton = document.createElement("button");
                collapseButton.className = "btn addCollapseButton";
                collapseButton.setAttribute("data-toggle", "collapse");
                collapseButton.setAttribute("data-target", ".WellContainer");
                //icon for button
                var collapseButtonIcon = document.createElement("icon-plus");
                collapseButtonIcon.className = "icon-plus";
                $(collapseButton).click(function(e) { $(this).toggleClass('active');});
                collapseButton.appendChild(collapseButtonIcon);

                //box element for "well" effect
                var well = document.createElement("div");
                well.className = "WellContainer collapse in";

                //search container
                var searchContainer = document.createElement('div');
                searchContainer.className = settings.searchContainerClass + ' input-append';
                //search input
                var searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.className = 'SearchPhrase span3';
                searchInput.setAttribute('placeholder', 'Phrase, keyword...');
                $(searchInput).attr('tabindex', 1);
                //search submit button
                var searchSubmit = document.createElement('button');
                searchSubmit.className = 'btn';
                searchSubmit.innerHTML = '<i class="icon-search"></i>';
                $(searchSubmit).attr('tabindex', 2);
                
                var searchAction = function() {
                    var phrase = $(searchInput).val();
                    if(phrase !== '') {
                        methods.openKeyword(phrase);
                    }
                };
                
                $(searchInput).keyup(function(event){
                    if(event.keyCode == 13){
                        searchAction();
                    }
                });

                $(searchSubmit).click(function(e) {
                    searchAction();
                });

                searchContainer.appendChild(searchInput);
                searchContainer.appendChild(searchSubmit);

                parentContainer.appendChild(collapseButton);
                parentContainer.appendChild(searchContainer);
                well.appendChild(inputContainer);
                parentContainer.appendChild(well);
                parentContainer.appendChild(listContainer);

                //initialize collapse behaviour
                $(".WellContainer").collapse();

                $(keywordsInput).tagsInput({
                    defaultText: '" placeholder="Add tag" tabindex="17"', //hack to include placeholder and tabindex attribute
                    width: 377,
                    height: 60
                });

                $(submit).click(function () {
                    //validation 
                    var titleValue = $(input).val();
                    if(titleValue == "") {
                        $(input).focus();
                        return;
                    }
                    methods.addIdea({title: titleValue, description: $(description).val(), keywords: $(keywordsInput).val()}, function (idea) {
                        //nothing for now
                    });
                    $(input).val("");
                    $(description).val("");
                    $(keywordsInput).importTags("");
                });
            },

            openKeyword: function(keyword) {
                //clear ideas from dom representation
                for(var i in ideas) {
                    ideas[i].Representation = null;
                }
                
                var title = "Ideas for "+keyword;
                
                dispatcher.dispatch('pageChanged', {'title': title, 'keyword': keyword, 'ideas': ideas});
                methods.clear();
                methods.loadByKeyword(keyword);
            },

            addIdea: function (ideaData, callback) {
                var data = { "Title": ideaData.title, "Description": ideaData.description, "Keywords": ideaData.keywords.split(',') };
                var success = function (dataResult, textStatus, jqXHR) {
                    data = $.extend(data, dataResult);
                    //if idea already exists - ommit adding representation
                    if(ideas[data.Key] == null) {
                        data.Value = 0;
                        data.Representation = methods.renderIdea(data, list);
                        ideas[data.Key] = data;
                    } else {
                        //if idea already exists it tell us that socket connection was indeed successful.
                        //only thing we need to do is add delete button (because we are owners of this idea)
                        var idea = ideas[data.Key];
                        //append retire button
                        var retireButton = methods._createRetireButton();

                        $(retireButton).click(function (e) {
                            methods.deleteIdea(idea);
                        });

                        $(idea.Representation).find('.UpButton').after(retireButton);
                    }
                    callback(data);
                };

                transport.send("POST", settings.baseUrl+"ideas", data, {"Content-Type": 'application/json'}, errorHandler, success);
            },
            renderIdea: function (idea, list) {

                var resultCounter = $.el.button({'class': 'btn btn-inverse Result'}, idea.Value);
                var resultElement = $.el.div({'class': 'ResultValueContainer'}, resultCounter);

                $(resultCounter).click(function(event) {
                    methods.showVotesForIdea(idea);
                });

                //up button
                var upButton = $.el.div({'class': "UpButton btn"},
                                    $.el.i({'class':'icon-thumbs-up'})); //icon

                $(upButton).click(function () {
                    methods.vote(idea, 1);

                    //visual state
                    resetButtonsState();
                    methods.selectButton(this);
                });

                //down button
                var downButton = $.el.div({'class': "DownButton btn"},
                                    $.el.i({'class':'icon-thumbs-down'})); //icon
                
                $(downButton).click(function () {
                    methods.vote(idea, -1);

                    //visual state
                    resetButtonsState();
                    methods.selectButton(this);
                });

                var resetButtonsState = function() {
                    $(downButton).removeClass("btn-danger").removeClass("disabled");
                    $(upButton).removeClass("btn-success").removeClass("disabled");   
                };

                //keyword field
                var keywordsElement = $.el.div({'class': 'Keywords'});

                if(idea.Keywords !== null) {
                    for(var i=0, l=idea.Keywords.length; i<l; i++ ) {
                        var keyword = $.trim(idea.Keywords[i]);
                        if(keyword === "") {
                            continue;
                        }

                        var link = 
                            $.el.a({'href':'/', 'title':'View '+keyword+' keyword'},
                                $.el.i({'class':'icon-tag'}), //icon
                                keyword //keyword name
                            ); 

                        var delegate = (function(keyword) {
                            return function(e) {
                                methods.openKeyword(keyword);
                                return false;
                            };
                        })(keyword);
                        $(link).click(delegate);
                        keywordsElement.appendChild(link);
                    }
                }

                //result and buttons container
                var resultContainer = 
                    $.el.div({'class':'ResultContainer'},
                        resultElement,
                        downButton,
                        upButton
                    );

                if(idea.Owner) {
                    var retireButton = methods._createRetireButton();

                    $(retireButton).click(function () {
                        methods.deleteIdea(idea);
                    });

                    //BEWARE - it should not be moved (whole scope) -> position in container
                    resultContainer.appendChild(retireButton);
                }

                //content container 
                var contentContainer = 
                    $.el.div({'class':'ContentContainer'},
                        $.el.div({'class':'Description'}, idea.Description), //description
                        keywordsElement, //keywords
                        $.el.span({'class': 'Author'}, idea.Author.DisplayName) //author
                    ); 

                var row = 
                    $.el.li({'id':idea.Key,'class':'span12 row'},
                        resultContainer,
                        $.el.h3({'class':'Title'}, idea.Title), //title
                        contentContainer
                    );

                list.appendChild(row);
                
                return row;
            },

            _createRetireButton: function() {
                //retire button
                return $.el.div({'class':'RetireButton btn'},
                           $.el.i({'class':'icon-trash'}) //icon
                       );
            },

            loadAll: function () {
                var success = function (data, textStatus, jqXHR) {
                    var ideasKeys = methods.renderIdeas(data);
                    
                    dispatcher.dispatch('loaded', ideasKeys);
                };

                transport.send("GET", settings.baseUrl+"ideas", "", "", errorHandler, success);
            },

            clear: function() {
                $(list).empty();
                ideas = [];
            },

            loadByKeyword: function(keyword) {
                var success = function (data, textStatus, jqXHR) {
                    var ideasKeys = methods.renderIdeas(data);
                    
                    dispatcher.dispatch('loaded', ideasKeys);
                };

                transport.send("GET", settings.baseUrl+"ideas/keyword/"+keyword, "", "", errorHandler, success);
            },

            renderIdeas: function(data) {
                //render all elements
                var ideasKeys = [];
                
                if(data.length > 0) {
                    $(data).each(function (index, element) {
                        element.Representation = methods.renderIdea(element, list);
                        ideas[element.Key] = element;
                        ideasKeys.push(element.Key);
                    });
                } else {
                    //show empty list communicate
                    methods.showAlert("No ideas present on this list or topic.");
                }

                return ideasKeys;
            },

            showAlert: function(communicate) {
                var emptyListAlert = 
                    $.el.li({'class':'EmptyListAlert span12 row'},
                        $.el.span({'class':'label label-important'}, 'Important'), //label
                        $.el.p(communicate) //paragraph
                        );

                list.appendChild(emptyListAlert);
            },

            vote: function (idea, value) {
                var newVote = { Value: value };

                var success = function (data, textStatus, jqXHR) {
                    if (data.Patched) {
                    } else {
                        alert("Unknown error during patching.");
                    }
                };

                transport.send("POST", settings.baseUrl + "ideas/" + idea.Key + '/votes', newVote, {"Content-Type": 'application/json'}, errorHandler, success);
            }, 

            deleteIdea: function (idea) {
                var success = function (data, textStatus, jqXHR) {
                    if (data.Deleted) {
                    } else {
                        alert("Unknown error during deleting.");
                    }
                };

                transport.send("DELETE", settings.baseUrl + "ideas/" + idea.Key, {}, {"Content-Type": 'application/json'}, errorHandler, success);
            }, 

            disable: function() {
                $(host).find("."+settings.inputContainerClass + " input").attr("disabled", "disabled");
                $(host).find("."+settings.inputContainerClass + " select").attr("disabled", "disabled");
                $(host).find("."+settings.inputContainerClass + " textarea").attr("disabled", "disabled");
                $(host).find("."+settings.searchContainerClass + " input").attr("disabled", "disabled");
            }, 

            markVoteStatus: function(ideaId, status) {
                var ideaRepresentation = methods.getIdeaRepresentation(ideaId);
                if(status > 0) {
                    methods.selectButton($(ideaRepresentation).find(".UpButton"));
                } else {
                    methods.selectButton($(ideaRepresentation).find(".DownButton"));
                }
            },

            selectButton: function(button) {
                if($(button).hasClass("UpButton")) {
                    $(button).addClass("btn-success").addClass("disabled");
                } else {
                    $(button).addClass("btn-danger").addClass("disabled");
                }
            },

            getIdeaRepresentation: function(ideaId) {
                return $(list).find("#"+ideaId)[0];
            },

            getIdea: function(ideaId) {
                return ideas[ideaId];
            },

            updateIdeaPosition: function(idea, valueDifference) {
                //check if idea should be placed in different place (order)
                var candidates = null;
                var comparer = null;
                var diffDirection = 0;
                if(valueDifference > 0) {
                    candidates = $(idea.Representation).prevAll();
                    comparer = function(candidateResult,siblingResult) { return candidateResult>siblingResult; };
                    diffDirection = -1;
                } else if(valueDifference < 0) {
                    candidates = $(idea.Representation).nextAll();
                    comparer = function(candidateResult,siblingResult) { return candidateResult<siblingResult; };
                    diffDirection = 1;
                }
                //find sibling difference
                var targetCandidate = null;
                var targetCandidateResult = null;
                for(var i=0,l=candidates.length; i<l; i++) {
                    var candidateResult = parseInt($(candidates[i]).find(".Result").html());
                    if(!comparer(idea.Value, candidateResult)) {
                        targetCandidate = candidates[i];
                        targetCandidateResult = candidateResult;
                        break;
                    }
                }
                if(targetCandidate === null) {
                    //not found candidates which are better than voted idea
                    targetCandidate = candidates[candidates.length-1];
                }    

                if(targetCandidate !== null) {
                    //move representation
                    $(idea.Representation).detach();
                    if(diffDirection == -1) {
                        //move up
                        if(comparer(idea.Value, targetCandidateResult)) {
                            $(targetCandidate).before(idea.Representation);
                        } else {
                            $(targetCandidate).after(idea.Representation);
                        }
                    } else if( diffDirection == 1) {
                        //move down
                        if(comparer(idea.Value, targetCandidateResult)) {
                            $(targetCandidate).after(idea.Representation);
                        } else {
                            $(targetCandidate).before(idea.Representation);
                        }
                    }
                }
            },

            showVotesForIdea: function(idea) {
                var success = function (data, textStatus, jqXHR) {
                    
                    // modal body
                    var modalBody = $.el.div({'class':'modal-body'});

                    data.forEach(function(vote) {
                        modalBody.appendChild(methods.renderVote(vote));
                    });

                    // modal footer
                    var modalFooter = 
                        $.el.div({'class':'modal-footer'}, 
                            $.el.a({'href':'#', 'class':'btn', 'data-dismiss':'modal'}, 'Close')
                        );
                    

                    var votesContainer = 
                        $.el.div({'class':'modal hide', 'id':'VotesContainer'},
                            //modal header
                            $.el.div({'class':'modal-header'},
                                $.el.button({'class':'close', 'type':'button', 'data-dismiss':'modal'}), //close button
                                $.el.h3('Votes for idea: ' + idea.Title) //header title
                                ),
                            modalBody,
                            modalFooter
                        );

                    $(votesContainer).modal("show");
                };

                transport.send("GET", settings.baseUrl + "ideas/" + idea.Key + '/votes', JSON.stringify({}),{}, errorHandler, success);
            },

            renderVote: function(vote) {
                var row = 
                    $.el.div(
                        $.el.div(
                            $.el.strong(vote.Author.DisplayName),
                            ' ('+vote.Author.Email+')'
                        )    
                    );
                    

                if(vote.Value > 0) {
                    row.className = "Positive";
                } else if(vote.Value < 0) {
                    row.className = "Negative";
                }

                return row;
            }
        };

        this.each(function () {
            //initialize
            methods.init(this);
        });

        //interface to the app
        return {
            addIdea: function (idea, callback) {
                methods.addIdea(idea, callback);
            },
            getTransport: function () {
                return transport;
            },
            load: function (keyword) {
                if(typeof(keyword) != "undefined" && keyword != null) {
                    return methods.loadByKeyword(keyword);
                } else {
                    return methods.loadAll();
                }
            }, 
            disable: function() {
                return methods.disable();
            },
            setCurrentVotesStatus: function(data) {
                for(var i=0,l=data.length; i<l; i++) {
                    if(data[i].value != null) {
                        methods.markVoteStatus(data[i].idea, data[i].value);
                    }
                }
            },
            getIdea: function(id) {
                return methods.getIdea(id);
            },
            updateIdeaValue: function(ideaId, difference) {
                //update model data
                var idea = methods.getIdea(ideaId);
                idea.Value += difference;

                //update UI
                $("#"+ideaId).find(".Result").html(idea.Value);

                //give visual response
                methods.updateIdeaPosition(idea, difference);
            },
            showAlert: function(communicate) {
                methods.showAlert(communicate);
            }, 
            appendIdea: function(idea) {
                idea.Value = 0;
                idea.Representation = methods.renderIdea(idea, list);
                ideas[idea.Key] = idea;
            }
        };
    };
})(jQuery);

var DefaultTransport = function () {
    return {
        send: function (method, address, content, headers, errorCallback, successCallback) {
            if(content != "") {
                content = JSON.stringify(content);
            }
            $.ajax({
                url: address,
                type: method,
                data: content,
                error: errorCallback,
                success: successCallback,
                dataType: "json",
                headers: headers
            });
        }
    }
};

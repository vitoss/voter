/// <reference path="jquery.js" />
/// <reference path="qunit.js" />
/// <reference path="sinon.js" />
/// <reference path="sinon-qunit.js" />
/// <reference path="Application.js" />

module("core", {
    setup: function () {
        this.baseContainer = document.createElement("div");
        this.baseContainer.className = "BaseContainer";
    },

    teardown: function () {
        this.baseContainer = null;
    }
});

test("We can inject custom transport.", function () {
    var transport = { send: function () { } };

    var app = $(this.baseContainer).VoteNow({
        transport: transport
    });
    
    deepEqual(app.getTransport(), transport, "Transport is not configurable.");
});

module("core/ui", {
    setup: function () {
        this.baseContainer = document.createElement("div");
        this.baseContainer.className = "BaseContainer";
    },

    teardown: function () {
        this.baseContainer = null;
    }
});

test("After init proper container is created.", function () {
    expect(1);

    $(this.baseContainer).VoteNow();

    strictEqual(this.baseContainer.childNodes.length, 4);
});

test("Input container has proper class name.", function () {
    expect(1);
    
    $(this.baseContainer).VoteNow({
        inputContainerClass: "testContainerName"
    });

    notStrictEqual($(this.baseContainer).find(".testContainerName").length, 0, "Input container has wrong class name");
});

test("Input container has input field and submit button.", function () {
    expect(2);

    $(this.baseContainer).VoteNow();

    var inputContainer = $(this.baseContainer).find(".InputContainer");
    var inputCandidates = $(inputContainer).find("input[type='text']");
    var submitCandidates = $(inputContainer).find("input[type='submit']");

    notStrictEqual(inputCandidates.length, 0, "Input field is missing");
    notStrictEqual(submitCandidates.length, 0, "Submit button is missing");
});

test("Input container has textarea description field.", function() {
    expect(1);

    $(this.baseContainer).VoteNow();

    var inputContainer = $(this.baseContainer).find(".InputContainer");
    var textareaCandidates = $(inputContainer).find("textarea");

    notStrictEqual(textareaCandidates.length, 0, "Description field textarea is missing.");
});

test("Input container has input for keywords.", function() {
    expect(1);

    $(this.baseContainer).VoteNow();

    var inputContainer = $(this.baseContainer).find(".InputContainer");
    var keywordsCandidates = $(inputContainer).find("input.KeywordsInput");

    notStrictEqual(keywordsCandidates.length, 0, "Keyword field input is missing.");
});

test("List container has proper class name.", function () {
    expect(1);

    $(this.baseContainer).VoteNow({
        listContainerClass: "listContainerName"
    });

    notStrictEqual($(this.baseContainer).find(".listContainerName").length, 0, "List container has wrong class name");
});

test("List dom object exists.", function () {
    expect(1);

    $(this.baseContainer).VoteNow({
        listContainerClass: "listContainerName"
    });

    var inputContainer = $(this.baseContainer).find(".listContainerName");

    strictEqual(inputContainer.find("ul").length, 1, "There should be list element in list container.");
});

test("Search input box should be present.", function() {
    expect(2);

    $(this.baseContainer).VoteNow();

    var searchContainer = $(this.baseContainer).find(".SearchContainer");
    var inputCandidates = $(searchContainer).find("input[type='text']");

    notStrictEqual(inputCandidates.length, 0, "Search input field is missing.");
    ok(inputCandidates.hasClass('SearchPhrase'), 'Search input field should has proper class name.');
});

test("Search submit input should be present.", function() {
    expect(1);

    $(this.baseContainer).VoteNow();

    var searchContainer = $(this.baseContainer).find(".SearchContainer");
    var inputCandidates = $(searchContainer).find("button");

    notStrictEqual(inputCandidates.length, 0, "Search submit button is missing.");
});

module("core/adding", {
    setup: function () {
        this.baseContainer = document.createElement("div");
        this.baseContainer.className = "BaseContainer";
        this.baseUrl = "http://localhost:8080/docs";
        
        this.app = $(this.baseContainer).VoteNow({
            transport: DefaultTransport(),
            baseUrl: this.baseUrl
        });

        var inputContainer = $(this.baseContainer).find(".InputContainer");
        this.input = $(inputContainer).find("input[type='text']")[0];
        this.submit = $(inputContainer).find("input[type='submit']")[0];

        var listContainer = $(this.baseContainer).find(".ListContainer");
        this.list = $(listContainer).find("ul");
    },

    teardown: function () {
        this.baseContainer = null;
        this.input = null;
        this.submit = null;
    }
});

test("Rendered idea should has representation.", function() {
    expect(1);
    
    var server = sinon.fakeServer.create();
    var returnedObject = { Title: "Idea1", Description: "None", Author: {Email: "vitotao@gmail.com", DisplayName: "First Last"} };
    
    server.respondWith("POST", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(returnedObject)
                       ]);
    
    var renderIdea;
    var callbackProxy = function(data) {
        renderIdea = data;
    };
    
    this.app.addIdea({title:"Idea3", description:"None"}, callbackProxy);
    
    server.respond();
    
    notStrictEqual("undefined", typeof(renderIdea.Representation), "Rendered idea should has 'Representation' property.");
});

test("Submit button is disable when input field is empty.", function () {
    expect(1);

    var transport = this.spy();
    this.app.transport = transport;

    //make sure input is clear
    $(this.input).val("");
    $(this.submit).trigger($.Event("click"));

    notStrictEqual(transport.called, "Transport shouldn't be called.");
});

test("Submitting non-empty input field should make call to server - triggered by API.", function () {
    expect(4);

    var server = sinon.fakeServer.create();
    var returnedObject = { Title: "Idea1", "Description": "None", "Author": {DisplayName:"First Last", Email: "vitotao@gmail.com"} };
    
    server.respondWith("POST", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(returnedObject)
                       ]);

    var callback = this.spy();

    this.app.addIdea({title:returnedObject.Title, description: returnedObject.Description}, callback);

    server.respond();

    strictEqual($(this.input).val().length, 0, "Input fields should be cleared.");
    ok(callback.called, "Callback should be called with proper data.");
    strictEqual($(this.list).children().length, 1, "New idea should be posted to list.");
    ok($(this.list).find("li .Title")[0].innerHTML.indexOf(returnedObject.Title) >= 0, "Content of new idea should be consistent.");
});

test("Submitting non-empty input field should make call to server - triggered by button.", function () {
    expect(3);

    var server = sinon.fakeServer.create();
    var returnedObject = { Title: "Idea1", Description: "Long description1", Author: "First Last", "@metadata": { "@id": "1"} };
    
    server.respondWith("POST", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(returnedObject)
                       ]);

    $(this.input).val(returnedObject.Title);
    $(this.submit).trigger($.Event("click"));

    server.respond();

    // console.log(server.requests); // Logs all requests so far
    
    strictEqual($(this.input).val().length, 0, "Input fields should be cleared.");
    strictEqual($(this.list).children().length, 1, "New idea should be posted to list.");
    ok($(this.list).find("li .Title")[0].innerHTML.indexOf(returnedObject.Title) >= 0, "Title is valid.");
});

test("Row should has id equal to key element", function () {
    expect(2);

    var server = sinon.fakeServer.create();

    var result = { Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Key1" };
    
    server.respondWith("POST", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(result)
                       ]);


    this.app.addIdea({title: result.Title, description: result.Description}, function () { });

    server.respond();
    strictEqual($(this.list).children().length, 1, "Loaded ideas should be posted to list.");
    strictEqual($(this.list).children("li")[0].id, result.Key, "Row should has proper id.");
});

test("List element should has Author field.", function () {
    expect(1);

    var server = sinon.fakeServer.create();

    var result = { Title: "Idea1", Description: "Long description1", Author: {Email: "vitotao@gmail.com", DisplayName: "First Last"}, Key: "Key1" };

    server.respondWith("POST", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(result)
                       ]);


    this.app.addIdea({title: result.Title, description: result.Description}, function () { });

    server.respond();
    strictEqual($(this.list).find("li .Author")[0].innerHTML, result.Author.DisplayName, "Row should has proper author field.");
});

test("List element should has Description field.", function () {
    expect(1);

    var server = sinon.fakeServer.create();

    var result = { Title: "Idea1", Description: "Long description1", Author: {Email: "vitotao@gmail.com", DisplayName: "First Last"}, Key: "Key1" };

    server.respondWith("POST", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(result)
                       ]);


    this.app.addIdea({title: result.Title, description:result.Description}, function () { });

    server.respond();
    strictEqual($(this.list).find("li .Description")[0].innerHTML, result.Description, "Row should has proper description field.");
});

test("New idea hasn't got Votes array - Result is 0.", function () {
    expect(2);

    var server = sinon.fakeServer.create();

    var result = { Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Key1", Value: 0 };

    server.respondWith("POST", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(result)
                       ]);

    var spy = this.spy(jQuery, "ajax");

    this.app.addIdea({title: result.Title, description:result.Description}, function () { });

    server.respond();

    var call = spy.getCall(0);
    ok(call.args[0].data.indexOf("Votes") == -1, "Votes array should not be present in request data.");
    equal(parseInt($(this.list).find("li .Result")[0].innerHTML), 0, "Result should be 0.");
});

module("core/loading", {
    setup: function () {
        this.baseUrl = "http://localhost:8080/docs";
        this.baseContainer = document.createElement("div");
        this.baseContainer.className = "BaseContainer";
        this.app = $(this.baseContainer).VoteNow({
            transport: DefaultTransport(),
            baseUrl: this.baseUrl
        });

        var inputContainer = $(this.baseContainer).find(".InputContainer");
        this.input = $(inputContainer).find("input[type='text']")[0];
        this.submit = $(inputContainer).find("input[type='submit']")[0];

        var listContainer = $(this.baseContainer).find(".ListContainer");
        this.list = $(listContainer).find("ul");
    },

    teardown: function () {
        this.baseContainer = null;
        this.input = null;
        this.submit = null;
    }
});

test("Load function should popoulate list with results", function () {
    expect(3);

    var server = sinon.fakeServer.create();

    server.respondWith("GET", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify([{ Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Idea1" },
                                        { Title: "Idea2", Description: "Long description2", Author: "First Last", Key: "Idea2"}])
                       ]);


    this.app.load();

    server.respond();
    strictEqual($(this.list).children().length, 2, "Loaded ideas should be posted to list.");
    ok($(this.list).find("li .Title")[0].innerHTML.indexOf("Idea1") >= 0, "Content of new idea should be consistent.");
    ok($(this.list).find("li .Title")[1].innerHTML.indexOf("Idea2") >= 0, "Title of idea should be loaded.");
});

test("Row should has id equal to key element", function () {
    expect(3);

    var server = sinon.fakeServer.create();
    var results = [{ Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Idea1" },
        { Title: "Idea2", Description: "Long description2", Author: "First Last", Key: "Idea2" }];

    server.respondWith("GET", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(results)
                       ]);


    this.app.load();

    server.respond();
    
    strictEqual($(this.list).children().length, 2, "Loaded ideas should be posted to list.");
    strictEqual($(this.list).children("li")[0].id, results[0].Key, "Row should has proper id.");
    strictEqual($(this.list).children("li")[1].id, results[1].Key, "Row should has proper id.");
});

test("When no ideas are returned - show empty list alert.", function() {
    expect(2);

    var server = sinon.fakeServer.create();
    var results = [];

    server.respondWith("GET", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(results)
                       ]);


    this.app.load();
    server.respond();

    var alertCandidate = $(this.list).children('li')[0];

    strictEqual(1, $(this.list).children('li').length, "Empty list should has only alert.");
    ok($(alertCandidate).hasClass("EmptyListAlert"), "Alert should has proper class name.");
});

test("Owner of idea should be presented with 'Retire' button", function() {
    expect(2);

    var server = sinon.fakeServer.create();
    var results = [{ Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Idea1", Owner: true },
        { Title: "Idea2", Description: "Long description2", Author: "First Last", Key: "Idea2", Owner: false }];

    server.respondWith("GET", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(results)
                       ]);


    this.app.load();

    server.respond();
    var firstIdea = $(this.list).children()[0];
    var secondIdea = $(this.list).children()[1];

    strictEqual($(firstIdea).find(".RetireButton").length, 1, "Idea with ownership for current user should have button.");
    strictEqual($(secondIdea).find(".RetireButton").length, 0, "Idea without ownership for current user should not have button.");
});

test("After loading keywords should be present on idea panel.", function () {
    expect(2);

    var server = sinon.fakeServer.create();

    server.respondWith("GET", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify([{ Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Idea1", Keywords: ["abc", "keyword1"] },
                                        { Title: "Idea2", Description: "Long description2", Author: "First Last", Key: "Idea2"}])
                       ]);


    this.app.load();
    server.respond();

    ok($(this.list).find("li")[0].innerHTML.indexOf("keyword1") >= 0, "Keyword 1 should be present.");
    ok($(this.list).find("li")[0].innerHTML.indexOf("abc") >= 0, "Keyword 2 should be present.");
});

module("core/voting", {
    setup: function () {
        this.baseUrl = "http://localhost:8080/docs";
        this.baseContainer = document.createElement("div");
        this.baseContainer.className = "BaseContainer";
        this.app = $(this.baseContainer).VoteNow({
            transport: DefaultTransport(),
            baseUrl: this.baseUrl
        });

        var inputContainer = $(this.baseContainer).find(".InputContainer");
        this.input = $(inputContainer).find("input[type='text']")[0];
        this.submit = $(inputContainer).find("input[type='submit']")[0];

        var listContainer = $(this.baseContainer).find(".ListContainer");
        this.list = $(listContainer).find("ul");

        this.server = sinon.fakeServer.create();

        this.Results = [{ Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Idea1", Value: 0, Votes: [{ Author: "test", Value: 1 }, { Author: "test2", Value: -1}] },
            { Title: "Idea2", Description: "Long description2", Author: "First Last", Key: "Idea2", Value: 5}];

        this.server.respondWith("GET", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(this.Results)
                       ]);
    },

    teardown: function () {
        this.baseContainer = null;
        this.input = null;
        this.submit = null;
        this.server = null;
        this.list = null;
    }
});

test("Every row should has voting result.", function () {
    expect(2);

    this.app.load();

    this.server.respond();

    strictEqual($(this.list).find("li .Result").length, 2, "Row has result panel.");
    equal($(this.list).find("li .Result")[0].innerHTML, 0, "Result value is proper.");
});

test("Every row should has up/down voting buttons", function() {
    expect(2);

    this.app.load();

    this.server.respond();

    equal($(this.list).find("li .UpButton").length, 2, "Row has Up button.");
    equal($(this.list).find("li .DownButton").length, 2, "Row has Down button.");
});

test("Up button should increse result by 1.", function () {
    expect(2);

    //propagate with some data
    this.app.load();
    this.server.respond();

    //find up button
    var upButton = $(this.list).find("li .UpButton")[0];
    var currentResult = parseInt($(this.list).find("li .Result")[0].innerHTML);

    //setup server
    this.server.respondWith("POST", this.baseUrl + "/" + this.Results[0].Key+'/votes',
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify({ Patched: true, Difference: 1})
                       ]);

    var ajaxSpy = this.spy(jQuery, "ajax");

    //trigger action
    $(upButton).trigger(new $.Event("click"));

    this.server.respond();

    var newResult = parseInt($(this.list).find("li .Result")[0].innerHTML);

    ok(ajaxSpy.called, "Make sure call to server is done.");
    equal(newResult, currentResult + 1, "Result should be increased.");
});

test("Down button should decrease result by 1.", function () {
    expect(3);

    //propagate with some data
    this.app.load();
    this.server.respond();

    //find up button
    var downButton = $(this.list).find("li .DownButton")[0];
    var currentResult = parseInt($(this.list).find("li .Result")[0].innerHTML);
    var currentVotesCount = this.Results[0].Votes.length;

    //setup server
    this.server.respondWith("POST", this.baseUrl + "/" + this.Results[0].Key + '/votes',
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify({ Patched: true, Difference: -1, Value: -1 })
                       ]);

    var ajaxSpy = this.spy(jQuery, "ajax");

    //trigger action
    $(downButton).trigger(new $.Event("click"));

    this.server.respond();

    var newResult = parseInt($(this.list).find("li .Result")[0].innerHTML);
    var newVotesCount = this.Results[0].Votes.length;

    ok(ajaxSpy.called, "Make sure call to server is done.");
    ok(ajaxSpy.getCall(0).args[0].data.indexOf("Author") >= 0 && ajaxSpy.getCall(0).args[0].data.indexOf("Value") >= 0, "Vote should be send to server.");
    equal(newResult, currentResult - 1, "Result should be descreased.");
});

module("core/deleting", {
    setup: function () {
        this.baseUrl = "http://localhost:8080/docs";
        this.baseContainer = document.createElement("div");
        this.baseContainer.className = "BaseContainer";
        this.app = $(this.baseContainer).VoteNow({
            transport: DefaultTransport(),
            baseUrl: this.baseUrl
        });

        var inputContainer = $(this.baseContainer).find(".InputContainer");
        this.input = $(inputContainer).find("input[type='text']")[0];
        this.submit = $(inputContainer).find("input[type='submit']")[0];

        var listContainer = $(this.baseContainer).find(".ListContainer");
        this.list = $(listContainer).find("ul");

        this.server = sinon.fakeServer.create();

        this.Results = [{ Title: "Idea1", Description: "Long description1", Author: "First Last", Key: "Idea1", Value: 0, Owner: true},
            { Title: "Idea2", Description: "Long description2", Author: "First Last", Key: "Idea2", Value: 5, Owner: true}];

        this.server.respondWith("GET", this.baseUrl,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify(this.Results)
                       ]);
    },

    teardown: function () {
        this.baseContainer = null;
        this.input = null;
        this.submit = null;
        this.server = null;
        this.list = null;
    }
});

test("Click on Retire button should send delete request.", function() {
    expect(2);
    
    this.app.load();
    this.server.respond();

    var deleteButton = $(this.list).find("li .RetireButton")[0];

    //setup server
    this.server.respondWith("DELETE", this.baseUrl + "/" + this.Results[0].Key,
                       [200, { "Content-Type": "application/json" },
                        JSON.stringify({Deleted: true})
                       ]);

    var ajaxSpy = this.spy(jQuery, "ajax");

    $(deleteButton).trigger(new $.Event("click"));
    this.server.respond();

    ok(ajaxSpy.called, "Make sure call to server is done.");
    strictEqual(this.list.children().length, 1, "Deleted idea should be removed from UI.");
});

module("core/authorization", {
    setup: function () {
        this.dispatcher = new EventBusClass();
        this.baseUrl = "http://localhost:8080/docs";
        this.baseContainer = document.createElement("div");
        this.baseContainer.className = "BaseContainer";
        this.app = $(this.baseContainer).VoteNow({
            transport: DefaultTransport(),
            baseUrl: this.baseUrl,
            dispatcher: this.dispatcher
        });

        var inputContainer = $(this.baseContainer).find(".InputContainer");
        this.input = $(inputContainer).find("input[type='text']")[0];
        this.submit = $(inputContainer).find("input[type='submit']")[0];

        var listContainer = $(this.baseContainer).find(".ListContainer");
        this.list = $(listContainer).find("ul");

        this.server = sinon.fakeServer.create();

        this.server.respondWith("GET", this.baseUrl,
                       [403, { "Content-Type": "application/json" },
                        "Forbidden"
                       ]);
    },

    teardown: function () {
        this.baseContainer = null;
        this.input = null;
        this.submit = null;
        this.server = null;
        this.list = null;
        this.dispatcher = null;
    }
});

test("When accessing data 503 (forbidden) status is returned - dispatcher is called with proper event", function() {
    expect(3);

    //setup dispatcher
    var eventListener = this.spy();
    this.dispatcher.addEventListener("error", eventListener);

    //propagate with some data
    this.app.load();
    this.server.respond();
    
    var eventObject = eventListener.getCall(0).args[0];
    ok(eventListener.calledOnce, "Listener is called when forbidden event happen.");
    ok(eventObject != null, "Dispatched event should has proper error object.");
    strictEqual(eventObject.target.status, 403, "Event error object should have proper status code.");
});

test("App should be able to be disabled", function() {
    expect(2);
    this.app.load();
    this.app.disable();

    ok($(this.input).is(":disabled"), "Input field should not allow to write text.");
    ok($(this.submit).is(":disabled"), "Submit button should be disabled.");
});

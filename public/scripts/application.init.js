$(document).ready(function () {
	function createAlertPanel() {
		//if alert panel is not present, create on
		var alertPanel = document.createElement("div");
		alertPanel.className = "alert alert-error fade in";
		alertPanel.innerHTML = '<a class="close" data-dismiss="alert" href="#">&times;</a><span class="message"></span>'; //close button
		$("#messages").append(alertPanel);
		return alertPanel;
	};

	//Initialize socket.io
    var socket = io.connect('http://localhost:1337');

	var dispatcher = new EventBusClass();
	dispatcher.addEventListener('error', function(errorObject) {
		if( errorObject.target.status == 403 ) {
			//disable forms
			app.disable();
			//show message asking for log in 
			var panel = createAlertPanel();
			$(panel).find('.message').html("You are not logged in or have insufficient priviledges. Please log in or change account.");
			$(panel).alert();

			//show empty row communicate
			app.showAlert("No ideas present on this list or topic.");
		} else if( errorObject.target.status == 401) {
			//not enough priviledges
			throw new Exception("TODO");
		}
	});

	dispatcher.addEventListener('loaded', function(loadedEvent) {
		var ideas = loadedEvent.target;
		socket.emit('RequestVotesForUserByIdeas', { "Ideas": ideas }); //user in session
	});

	/*Socket listeners*/
	socket.on("VotesForUserByIdeas", function(data) {
		app.setCurrentVotesStatus(data);
	});

	socket.on("IdeaValueChanged", function(data) {
		app.updateIdeaValue(data.idea, data.difference);
	});

	socket.on("IdeaDeleted", function(data) {
		console.log("Removing idea representation: "+data.idea);
		$("#"+data.idea).remove();
	});

	socket.on("IdeaAdded", function(data) {
		console.log("Adding idea representation: "+data.Key);
		app.appendIdea(data);
	});

    var app = $("#content").VoteNow({
        transport: DefaultTransport(),
        baseUrl: "/", 
        dispatcher: dispatcher
    });

    if($.appInit != null && $.appInit.startKeyword != null) {
    	app.load($.appInit.startKeyword);
    } else {
    	app.load();
    }

    
});
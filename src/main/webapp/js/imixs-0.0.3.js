/*******************************************************************************
 * Imixs Workflow - jQUery API Copyright (C) 2012 Imixs Software Solutions GmbH,
 * http://www.imixs.com
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You can receive a copy of the GNU General Public License at
 * http://www.gnu.org/licenses/gpl.html
 * 
 * Project: http://www.imixs.org
 * 
 * Contributors: Imixs Software Solutions GmbH - initial API and implementation
 * Ralph Soika - Software Developer
 ******************************************************************************/

var imixsServiceLocationURI = null;
var defaultModelVersion = null;
var defaultProcessID = null;
var requestLocale = null;

/**
 * This method is used to setup the workflow service
 * 
 * @param aLocation -
 *            prafix for RESTService URI
 * @param aDefaultModel -
 *            default model version
 * @param aDefaultProcess -
 *            default ProcessID
 */
function setupWorkflowService(aLocation, aDefaultModel, aDefaultProcessID) {
	imixsServiceLocationURI = aLocation;
	defaultModelVersion = aDefaultModel;
	defaultProcessID = aDefaultProcessID;
}

/**
 * this method clears the stored elements from the local cache
 * 
 * @param identifier
 */
function clearWorkflowElement(identifier) {
	// alert('clearView....');
	localStorage.removeItem("org.imixs.workflow." + identifier);

}

/**
 * This method load a collection of workItems defined by a REST service URI.
 * After the Ajax request is finished successful the method calls
 * wirtWorkitems() to print the result into a page element.
 * 
 * The result is stored into the clients localStorage.
 * 
 * @param service
 *            workflow/worklistbyowner/null.json
 */
function loadWorkitems(service) {

	// we first test if we still have the workflow groups in the local storage
	var data = localStorage.getItem("org.imixs.workflow." + service);
	if (data == null) {
		// create the list of workitems using the RESTful service interface
		var serviceURL = imixsServiceLocationURI + service;
		if (serviceURL.indexOf('?') > -1)
			serviceURL = serviceURL + "&";
		else
			serviceURL = serviceURL + "?";
		$
				.getJSON(
						serviceURL,
						{
							count : "30",
							start : "0",
							items : "$uniqueid,txtworkflowgroup,txtworkflowstatus,txtworkflowsummary,txtworkflowimageurl,namcurrenteditor,$modified"
						}, function(data) {
							// alert('REST Service: worklist loaded....');
							// json request finished store the worklist.....
							localStorage.setItem("org.imixs.workflow."
									+ service, JSON.stringify(data));
							refreshWorklistView(service);

						});

	} else {
		// use workflow groups from cache
		// alert("liste from cache=" + vWorkflowGroups);
		refreshWorklistView(service);
	}
}

/**
 * this method fills the page element ID=worklist_view with the selected
 * workitems
 * 
 */
function refreshWorklistView(service) {
	// alert('Write worklist...');

	dataString = localStorage.getItem("org.imixs.workflow." + service);
	var data = JSON.parse(dataString);
	// clear list
	$("#worklist_view").empty();

	if (data == null) {
		$("#worklist_view").append(
				"<li class=\"workitem\">Keine Daten vorhanden</li>");
		return;
	}

	// test if data.entity is an array....
	if (!$.isArray(data.entity))
		data.entity = jQuery.makeArray(data.entity);

	// iterate over all workitems
	$
			.each(
					data.entity,
					function(i, workitem) {

						var imgurl = workitem.item[4].value.$;
						// take defualt image if no image url is provided
						if (imgurl == null)
							imgurl = "/t4po/images/profile-48.gif";

						var img = "<div class=\"workitem-thumb\"><img class=\"\" src=\""
								+ imgurl + "\" /></div>";
						var p_status = "<span class=\"workitem-summary\"><b>"
								+ workitem.item[1].value.$ + "</b>: "
								+ workitem.item[2].value.$ + "</span>";

						$("#worklist_view")
								.append(
										"<li class=\"workitem\" onclick=\"loadWorkitem('"
												+ workitem.item[0].value.$
												+ "');\">"
												+ img
												+ "<div class=\"workitem-info\"><h3><a href=\"#\">"
												+ ""
												+ workitem.item[3].value.$
												+ "</a></h3>"
												+ p_status
												+ "</div><div style=\"clear:left;\" /></li>");

					});

}

// ############## Workitem ####################

/**
 * this method loads a single workItem from the REST service and calls the
 * method updateForm to print the content into a page. The optional selectorID
 * specifies the area where the form data is placed. If no seletorId is given
 * Imixs-Script searches for a section with the id #workitem_view.
 * 
 * 
 * @param uid -
 *            $uniqueid of the workitem to be loaded
 * @param selectorId -
 *            optinal param to define the section where the form data is filled
 *            in
 */
function loadWorkitem(uid, selectorId) {

	if (selectorId == null || selectorId == "")
		selectorId = '#workitem_view';

	// we first test if we still have the workflow groups in the local storage
	// var data = localStorage.getItem("org.imixs.workflow." + uid);

	// allways reload the workitem!
	var data = null;
	if (data == null) {
		// load the workitem by it's $uniqueid
		$.getJSON(imixsServiceLocationURI + "workflow/workitem/" + uid
				+ ".json?", {
		// items :
		// "$uniqueid,$modelversion,$processid,txtworkflowgroup,txtworkflowstatus,txtworkflowsummary,txtworkflowimageurl,namcurrenteditor,$modified,txtworkflowabstract,_subject"
		}, function(data) {
			updateForm(data, selectorId);
		});

	}
}

/**
 * This method updates a page section with the current workitem data. The method
 * also rebuilds the activity section
 * 
 * @param aWorkitem - the data object
 * @param aSelector -
 *            optinal param to define the section where the form data is filled
 *            in
 */
function updateForm(aWorkitem, aSelector) {
	disableActivities(aSelector);
	loadProcessEntity(aWorkitem);
	loadActivityList(aWorkitem, aSelector);
	updateInputFields(aWorkitem, aSelector);
}

/**
 * This method updates the input field values for all properties provided by the
 * current workItem. The method only updates fields in specified selector. If no
 * selectorId is provided the selectorId defaults to 'workitem_view'.
 * 
 * Each value of an input element with a name corresponding to a item contained
 * in the current Workitem will be updated.
 * 
 * The method also clears all available Input fields (this is because of the
 * case that a workItem did not provide a item for a specific input field. So in
 * this case we need to clear the input in any case)
 * 
 * @param aworkitem
 *            the workitem with the properties
 * @param sectionid
 *            an optional selector
 */
function updateInputFields(aWorkitem, selectorId) {

	if (selectorId == null || selectorId == "")
		selectorId = '#workitem_view';

	$(selectorId).trigger('beforeRefresh');

	/* clear input fields... */
	clear_form_elements(selectorId);

	/*
	 * next we test if an element with the current item name exists. Then the
	 * .text() method will replace the content
	 */
	$.each(aWorkitem.item, function(i, item) {
		var tagName = selectorId + " [name=" + item.name + "]";
		var tagValue = "";

		if (item.value!=null && item.value.$ != null)
			tagValue = item.value.$;

		// $ is not allowed in a id because of jquery internals...
		tagName = tagName.replace('$', '\\$');
		if ($(tagName).length > 0) {
			$(tagName).val(tagValue);
		}

	});

	// see http://stackoverflow.com/questions/399867/custom-events-in-jquery
	$(selectorId).trigger('afterRefresh', aWorkitem);
}

/**
 * This method ad action buttons for the current workitem into the selectorID.
 * Each activity for the currcen processID will result in a button. The method
 * did not add activity buttons with the activityEntity property
 * keypublicresult!=0.
 * 
 * The method also adds all necessary hidden fields for processing a workitem.
 * 
 * @param workitem -
 *            the current workitem
 * 
 */
function updateActivities(workitem, selectorId) {

	if (selectorId == null || selectorId == "")
		selectorId = '#workitem_view';

	var modelversion = getEntityItemValue(workitem, "$modelversion");
	var processid = getEntityItemValue(workitem, "$processid");
	var unqiueid = getEntityItemValue(workitem, "$uniqueid");
	var isauthor = getEntityItemValue(workitem, "$isauthor");

	// iterate over all activity entities
	var dataString = localStorage.getItem("org.imixs.workflow.activities."
			+ modelversion + "." + processid);

	var currentActivityList = JSON.parse(dataString);

	// clear list
	$(selectorId + " #workitem_activities").empty();

	// iterarte over all activities if available...
	// activities will be only shown is workitem isNew or user isAuthor
	if (currentActivityList != null && (unqiueid=="" || isauthor=="true")) {
		// test if currentActivityList.entity is an array....
		if (!$.isArray(currentActivityList.entity))
			currentActivityList.entity = jQuery
					.makeArray(currentActivityList.entity);
		// iterate over all activities
		$.each(currentActivityList.entity, function(i, activity) {
			// build a button....
			var actionName = getEntityItemValue(activity, "txtname");
			var testPublicResult = getEntityItemValue(activity,
					"keypublicresult");
			var activityID = getEntityItemValue(activity, "numactivityid");
			// only add button if keypublicresult!=0
			if ("0" != testPublicResult)
				addActionButton(selectorId, actionName, activityID);

		});
	}

	// append the cancel button
	$(selectorId + " #workitem_activities")
			.append(
					"<input id=\"cancel_button\" type=\"button\" value=\"Cancel\"></input>");
	// bind clearWorkitem method
	// we need to bind the click method using jquery because otherwise external
	// code can not unbind this call
	$(selectorId + " #workitem_activities #cancel_button").click(
			function(event) {
				clearWorkitem(selectorId);
			});

	// add $unqiueid, $modelversion, $activitid and $processid input fields if
	// yet not part of the form
	// $ is not allowed in a id because of jquery internals...
	if ($(selectorId + " [name=\\$activityid]").length <= 0)
		$(selectorId + " #workitem_activities").append(
				"<input type=\"hidden\" name=\"$activityid\"></input>");
	if ($(selectorId + " [name=\\$processid]").length <= 0)
		$(selectorId + " #workitem_activities").append(
				"<input type=\"hidden\" name=\"$processid\" value=\""
						+ processid + "\"></input>");
	if ($(selectorId + " [name=\\$uniqueid]").length <= 0)
		$(selectorId + " #workitem_activities").append(
				"<input type=\"hidden\" name=\"$uniqueid\" value=\"" + unqiueid
						+ "\"></input>");
	if ($(selectorId + " [name=\\$modelversion]").length <= 0)
		$(selectorId + " #workitem_activities").append(
				"<input type=\"hidden\" name=\"$modelversion\" value=\""
						+ modelversion + "\"></input>");
	if ($(selectorId + " [name=type]").length <= 0)
		$(selectorId + " #workitem_activities")
				.append(
						"<input type=\"hidden\" name=\"type\" value=\"workitem\"></input>");

	$(selectorId + ' #workitem_activities').trigger('afterRefresh', workitem);

	// finally style all buttons...
	$(selectorId + " #workitem_activities input:button,input:submit").button();

}

/**
 * clears all input fiels inside the given formpart
 */
function clear_form_elements(formpart) {

	$(formpart).find(':input').each(function() {
		switch (this.type) {
		case 'text':
		case 'hidden':
		case 'password':
		case 'select-multiple':
		case 'select-one':
		case 'textarea':
			$(this).val('');
			break;
		case 'checkbox':
		case 'radio':
			this.checked = false;
		}
	});

}

/**
 * This method create a new empty workitem and clears also the workitem_view
 */
function clearWorkitem(selectorId) {
	if (selectorId == null || selectorId == "")
		selectorId = '#workitem_view';

	newWorkitem = {
		"item" : [ {
			"name" : "$processid",
			"value" : {
				"@type" : "xs:int",
				"$" : defaultProcessID
			}
		}, {
			"name" : "$modelversion",
			"value" : {
				"@type" : "xs:string",
				"$" : defaultModelVersion
			}
		}, {
			"name" : "_subject",
			"value" : {
				"@type" : "xs:string",
				"$" : ""
			}
		} ]
	};

	updateForm(newWorkitem, selectorId);

}

/**
 * This method loads the specifiy processEntity. The method uses the
 * localStorage to cache processEntities already loaded
 * 
 * @param workitem -
 *            the current workitem
 */
function loadProcessEntity(workitem, selectorId) {

	var processid = null;
	var modelversion = null;

	// read processID and model version.....
	$.each(workitem.item, function(i, item) {

		if (item.name == "$modelversion")
			modelversion = item.value.$;
		if (item.name == "$processid")
			processid = item.value.$;

		if (modelversion != null && processid != null)
			return;

	});

	// we first test if we still have the Entity in the local storage
	var currentProcessEntity = localStorage
			.getItem("org.imixs.workflow.process." + modelversion + "."
					+ processid);
	if (currentProcessEntity == null) {
		// now we need to load the model information from the rest service...
		$.getJSON(imixsServiceLocationURI + "model/" + modelversion
				+ "/process/" + processid + ".json", function(data) {
			// cache the result
			localStorage.setItem("org.imixs.workflow.process." + modelversion
					+ "." + processid, JSON.stringify(data));
			refreshWorkitemProcessView(currentProcessEntity, selectorId);
		});
	} else
		refreshWorkitemProcessView(currentProcessEntity, selectorId);

}

/**
 * This method loads the specifiy activitylist. The method uses the localStorage
 * to cache Entities already loaded
 * 
 * @param workitem -
 *            the current workitem
 * 
 * @param selectorId -
 *            optional param to force a refresh of a specific section
 */
function loadActivityList(workitem, selectorId) {

	var modelversion = getEntityItemValue(workitem, "$modelversion");
	var processid = getEntityItemValue(workitem, "$processid");

	// we first test if we still have the Entity in the local storage
	var currentProcessEntity = localStorage
			.getItem("org.imixs.workflow.activities." + modelversion + "."
					+ processid);
	if (currentProcessEntity == null) {
		// now we need to load the model information from the rest service...
		$.getJSON(
				imixsServiceLocationURI + "model/" + modelversion
						+ "/activities/" + processid + ".json",
				function(data) {
					// cache the result
					localStorage.setItem("org.imixs.workflow.activities."
							+ modelversion + "." + processid, JSON
							.stringify(data));
					updateActivities(workitem, selectorId);
				}).error(function() {
			// if an error occur we also need to update the activityview....
			updateActivities(workitem, selectorId);
		});
	} else
		updateActivities(workitem, selectorId);

}

/**
 * this method writes the html code for the current ProcessEntity into the
 * element workitem_view
 * 
 * @param aProcessEntity
 *            the aProcessEntity to be loaded
 */
function refreshWorkitemProcessView(aprocessEntity, selectorId) {
	// ;
}

/**
 * This method is called by the loadWorkitem() method to disable any action
 * buttons from the current form until the workitem_view is refreshed
 * completley. This is only a helper method to avoid inconsistent submits if the
 * refresh process of the workitem_view will break for any reason.
 */
function disableActivities(selectorId) {
	$(':input:button, :input:submit', selectorId + ' #workitem_activities')
			.each(function() {
				// disable the button...
				$(this).attr('disabled', 'disabled');
			});

}

/**
 * Add a workflow action buttion int a defined section
 * 
 * @param selectorId -
 *            the name of the section the buttion should be placed in
 * @param actionName
 * @param activityID
 * @param bInsert -
 *            optional
 */
function addActionButton(selectorId, actionName, activityID, bInsert) {
	if (selectorId == null || selectorId == "")
		selectorId = '#workitem_view';

	// build a button....
	var activityScript = "onclick=\"processWorkitem('" + activityID + "');";
	// insert at the bginning of the tag?
	if (bInsert)
		$(selectorId + " #workitem_activities").prepend(
				"<input type=\"submit\" value=\"" + actionName + "\" "
						+ activityScript + "\"></input>");
	else
		$(selectorId + " #workitem_activities").append(
				"<input type=\"submit\" value=\"" + actionName + "\" "
						+ activityScript + "\"></input>");
}

/**
 * This method updates the $activityid input field .
 * 
 * @param activityid
 */
function processWorkitem(activityid) {
	$('#workitem_view').trigger('beforeProcess');

	var tagName = "#workitem_activities [name=\\$activityid]";
	if ($(tagName).length > 0) {
		$(tagName).val(activityid);
	}

}

/**
 * This method returns the value of a specified item inside an entity. Maybe we
 * can optimize the method???
 * 
 * @param entity
 */
function getEntityItemValue(entity, itemname) {
	var value = "";
	$.each(entity.item, function(i, item) {
		if (item.name == itemname) {
			if (item.value != null) {

				if ($.isArray(item.value))
					value = item.value[0].$;
				else
					value = item.value.$;
				return;

			}
		}
	});
	return value;

}

/**
 * This method returns the value of a specified item inside an entity. Maybe we
 * can optimize the method???
 * 
 * @param entity
 */
function getEntityItemValueArray(entity, itemname) {
	var value = "";
	$.each(entity.item, function(i, item) {
		if (item.name == itemname) {
			if (item.value != null) {

				if ($.isArray(item.value))
					value = item.value;
				else
					value = jQuery.makeArray(item.value);
				return;

			}
		}
	});
	return value;

}

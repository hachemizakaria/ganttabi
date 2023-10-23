/*
ganttabi 
version : 0.2.022

 - calculate max and min from date column
 - reformat (pivot) data 
 - group reformated data (javascript json grouping ?!)
 - draw header
 - draw table
 - remove template from html

*/

function replacePlaceholders(inputString, replacements, enclosingCharacter = '#') {
    // Escape the enclosingCharacter in the regular expression pattern
    const escapedEnclosingCharacter = enclosingCharacter.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`${escapedEnclosingCharacter}([^${escapedEnclosingCharacter}]+)${escapedEnclosingCharacter}`, 'g');
    return inputString.replace(regex, (match, placeholder) => {
        if (replacements.hasOwnProperty(placeholder)) {
            return replacements[placeholder];
        } else {
            return ''; // Remove the unmatched placeholder
        }
    });
}

function calculateMinMaxDate(data, date_column_name) {
    let maxDate = new Date(data[0][date_column_name]);
    let minDate = new Date(data[0][date_column_name]);

    for (let i = 1; i < data.length; i++) {
        const currentDate = new Date(data[i][date_column_name]);

        if (currentDate > maxDate) {
            maxDate = currentDate;
        }

        if (currentDate < minDate) {
            minDate = currentDate;
        }
    }

    return { maxDate, minDate };
}

function leftPadWithZeros(number, width) {
    // Convert the number to a string
    var numberStr = number.toString();

    // Calculate the number of zeros to add
    var zerosToAdd = width - numberStr.length;

    // Add the zeros to the left of the number
    var paddedNumber = '0'.repeat(zerosToAdd) + numberStr;

    return paddedNumber;
}




function formatDate(dateString, format) {
    function getMonthAbbreviation(month) {
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        return months[month];
    }
    const date = new Date(dateString);

    const formatParts = {
        "DD": String(date.getDate()).padStart(2, "0"),
        "MM": String(date.getMonth() + 1).padStart(2, "0"), // Month is zero-based
        "YYYY": date.getFullYear(),
        "MON": getMonthAbbreviation(date.getMonth()),
        "HH": String(date.getHours()).padStart(2, "0"),
    };

    return format.replace(/DD|MM|YYYY|MON|HH/g, (match) => formatParts[match]);
}




function kindOfgroupByColumn(data, groupingColumnNames) {
    function processProperty(item, groupedDataObject, groupName, prop) {
        if (item[prop] !== undefined) {
            if (!groupedDataObject[groupName][prop]) {
                groupedDataObject[groupName][prop] = item[prop];
            } else if (isValueObject(item[prop]) && groupedDataObject[groupName][prop].value !== undefined) {
                groupedDataObject[groupName][prop].value += item[prop].value;
            }
        }
    }

    function isValueObject(obj) {
        return typeof obj === 'object' && obj.value !== undefined;
    }
    var dataGrouped = [];
    var groupedDataObject = {};

    data.forEach(function (item) {
        var groupName = groupingColumnNames.map(column => item[column]).join('_');

        if (!groupedDataObject[groupName]) {
            groupedDataObject[groupName] = {};
            groupingColumnNames.forEach(column => {
                groupedDataObject[groupName][column] = item[column];
            });
        }

        for (var prop in item) {
            if (!groupingColumnNames.includes(prop)) {
                processProperty(item, groupedDataObject, groupName, prop);
            }
        }
    });

    for (var groupName in groupedDataObject) {
        dataGrouped.push(groupedDataObject[groupName]);
    }

    return dataGrouped;
}


function getIndexByKey(arr, key, value) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][key] === value) {
            return i;
        }
    }
    return -1; // Return -1 if no matching object is found
}

function getMaxDateForTag(data, tag) {
    const filteredData = data.filter(obj => obj.header_tag === tag);
    if (filteredData.length === 0) {
        return null; // Return null if no matching objects found
    }
    const maxDate = filteredData.reduce(
        (max, obj) => {
            return obj.header_date_max > max ? obj.header_date_max : max;
        },
        filteredData[0].header_date_max);
    return maxDate;
}

function reformatData(dataIn, tableOptions) {


    let { maxDate, minDate } = calculateMinMaxDate(dataIn, tableOptions.gtc_date_column_name);

    // calculate the number of column used for the schedule 
    // comment : 
    let gtc_table_schedule_maxcount = Math.ceil((maxDate - minDate) / (tableOptions.gtc_table_step * tableOptions.gtc_table_unit));



    let dataDisplay = [];
    let dataHeader = [];

    // extract headers to dataHeader
    for (var displayColumn = 0; displayColumn < gtc_table_schedule_maxcount; displayColumn++) {
        let headerDateMax = new Date(
            minDate.getTime() + (displayColumn + 1) * tableOptions.gtc_table_step * tableOptions.gtc_table_unit
        );

        let headerDateMin = new Date(
            minDate.getTime() + displayColumn * tableOptions.gtc_table_step * tableOptions.gtc_table_unit
        );


        // let headerTag = "H" + c;
        let headerTag = tableOptions.gtc_header_string + displayColumn.toString().padStart(3, '0');

        var colheader = {
            header_tag: headerTag,
            header_date_min: headerDateMin,
            header_date_max: headerDateMax,
        };

        dataHeader.push(colheader);
    }

    // initialize dataDisplay from dataIn using defined columns
    const keysToInclude = tableOptions.gtc_left_columns_names;
    dataDisplay = dataIn.map(obj => {
        const newObj = {};
        keysToInclude.forEach(key => {
            newObj[key] = obj[key];
        });
        return newObj;
    });



    // generate schedule dataDisplay from dataIn
    for (var i = 0; i < dataIn.length; i++) { // by row
        for (var displayColumn = 0; displayColumn < gtc_table_schedule_maxcount; displayColumn++) {

            //
            let headerTagData = tableOptions.gtc_header_string + displayColumn.toString().padStart(3, '0');

            const currentDateValue = new Date(dataIn[i][tableOptions.gtc_date_column_name]);

            if (
                // if columndate between date min and date max
                new Date(dataHeader[displayColumn].header_date_min) <= currentDateValue
                && currentDateValue < new Date(dataHeader[displayColumn].header_date_max)
            ) {
                // set display cell value and style
                dataDisplay[i][headerTagData] = {
                    gtc_attr01 : dataIn[i][tableOptions.gtc_attr01_column],
                    gtc_attr02 : dataIn[i][tableOptions.gtc_attr02_column],
                    gtc_attr03 : dataIn[i][tableOptions.gtc_attr03_column],
                    gtc_attr04 : dataIn[i][tableOptions.gtc_attr04_column],
                    gtc_attr05 : dataIn[i][tableOptions.gtc_attr05_column],
                };



            } else {
                dataDisplay[i][headerTagData] = "";
            }
        }
    }


    // kind of grouping data by array of columns
    dataDisplay = kindOfgroupByColumn(dataDisplay, tableOptions.gtc_left_columns_names);



    return { dataDisplay, dataHeader };
}
function drawthead(htmlNode, dataDisplay, dataHeader, headerDateFormat) {

    const thead = htmlNode.querySelector("thead");
    const thRow = thead.insertRow(); // insert tr 
    var i = 0;
    for (const keyAsHeaderTag in dataDisplay[0]) {
        if (dataDisplay[0].hasOwnProperty(keyAsHeaderTag)) {
            const th = document.createElement("th");

            th.classList.add("t-Report-colHead");
            th.setAttribute('id', keyAsHeaderTag);



            const theadthdiv = document.createElement("div"); //??


            theadthdiv.setAttribute("align", 'center');
            if (getIndexByKey(dataHeader, "header_tag", keyAsHeaderTag) >= 0) {

                const gtc_header_time_display = document.createElement("div");
                gtc_header_time_display.textContent = formatDate(getMaxDateForTag(dataHeader, keyAsHeaderTag), headerDateFormat);
                theadthdiv.appendChild(gtc_header_time_display);
            } else {
                // left headers 
                theadthdiv.textContent = keyAsHeaderTag;
            }

            th.appendChild(theadthdiv);

            if (i == 0) {
                th.classList.add("col-fixed");
            }

            i++;
            thRow.appendChild(th);
        }
    }
    return i;
}
function drawtbody(htmlNode, dataDisplay, headerStringPattern, cellTemplateHtml) {

    const tbody = htmlNode.querySelector("tbody");

    // draw tbody by row
    for (const dataRow of dataDisplay) {
        const row = tbody.insertRow();

        let currentColumnInRow = 0;

        // iterate over columns in dataDisplay
        for (const ColumnHeaderKey in dataRow) {


            if (dataRow.hasOwnProperty(ColumnHeaderKey)) {

                const cell = row.insertCell();
                cell.classList.add('t-Report-cell');
                cell.setAttribute('headers', ColumnHeaderKey);


                var scheduleHeaderPattern = new RegExp(headerStringPattern + '\\d+');
                if (scheduleHeaderPattern.test(ColumnHeaderKey) && dataRow[ColumnHeaderKey]) {

                    // replace * placeholders
                    const replacementsVal = {
                        
                        "GTC_ATTR01_VALUE" :  dataRow[ColumnHeaderKey].gtc_attr01 ?? '',
                        "GTC_ATTR02_VALUE" :  dataRow[ColumnHeaderKey].gtc_attr02 ?? '',
                        "GTC_ATTR03_VALUE" :  dataRow[ColumnHeaderKey].gtc_attr03 ?? '',
                        "GTC_ATTR04_VALUE" :  dataRow[ColumnHeaderKey].gtc_attr04 ?? '',
                        "GTC_ATTR05_VALUE" :  dataRow[ColumnHeaderKey].gtc_attr05 ?? '',

                    };

                    // Set the innerHTML replacing PlaceHolders
                    cell.innerHTML = replacePlaceholders(
                        cellTemplateHtml
                        , replacementsVal
                        , '*'
                    );

                } else {
                    cell.textContent = dataRow[ColumnHeaderKey];
                }

                if (currentColumnInRow == 0) {
                    cell.classList.add("col-fixed");
                }

                currentColumnInRow++;
            }
        }
    }
}


function load()

 {
    console.log('-start-');

    // define table container ...
    var gtc_container = document.getElementById("gtc_container");

    // read data
    var data = JSON.parse(gtc_container.getAttribute('data'));

    var gtc_options = JSON.parse(gtc_container.getAttribute("option-data"));

    // read parameters
    var tableOptions = {
        gtc_table_step: 1, // comment : one for one day 
        gtc_table_unit: 1000 * 60 * 60 * 24, // comment : one day as unit
        gtc_header_string: "ct-H", // used 
       
        gtc_date_column_name: gtc_options.date_column,
        gtc_left_columns_names: gtc_options.left_columns.split(','),
        gtc_header_date_format: gtc_options.date_format,
        
        gtc_attr01_column : gtc_options.gtc_attr01_column,
        gtc_attr02_column : gtc_options.gtc_attr02_column,
        gtc_attr03_column : gtc_options.gtc_attr03_column,
        gtc_attr04_column : gtc_options.gtc_attr04_column,
        gtc_attr05_column : gtc_options.gtc_attr05_column


    };


    // prepare data to fit in table
    var { dataDisplay, dataHeader } = reformatData(data, tableOptions);




    // populate reformated data into html container
    {
        var gtcBadgeHtmlTemplate = document.getElementById("ganttabi_badge_template"); //TODO : this will prevent two in same page
        var gtcTableHtmlTemplate = document.getElementById("ganttabi_table_template");

        gtc_container.innerHTML = gtcTableHtmlTemplate.innerHTML;
        drawthead(gtc_container, dataDisplay, dataHeader, tableOptions.gtc_header_date_format);
        drawtbody(gtc_container, dataDisplay, tableOptions.gtc_header_string, gtcBadgeHtmlTemplate.innerHTML);

        // Remove the templates blocks from the document
        gtcBadgeHtmlTemplate.remove();
        gtcTableHtmlTemplate.remove();
    }
    console.log('-end-');




}

load();





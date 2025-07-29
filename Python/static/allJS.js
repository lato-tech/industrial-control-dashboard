const sideBarBt1 = document.getElementById('sidebar_Settings');
const sideBarBt2 = document.getElementById('sidebar_IOstate');
const sideBarBt3 = document.getElementById('sidebar_BatchList');
const sideBarBt4 = document.getElementById('sidebar_Database');
const sideBarBt5 = document.getElementById('sidebar_Maintenance');
const tableCells = document.querySelectorAll("td");
const Heading12k = document.getElementById('Heading12k');
const HeadingAll = document.getElementById('HeadingAll');

let cPanel;
let cBatch;
let cEvent;
let cCycle;
let cBatchAll;

const userDrop = document.getElementById("userDrop");
const now = new Date();

const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA').split('T')[0];
const toDate = now.toLocaleDateString('en-CA').split('T')[0];

document.getElementById('from-date').value = fromDate;
document.getElementById('to-date').value = toDate;

document.getElementById('from-date2').value = toDate;
document.getElementById('to-date2').value = toDate;

function openFullscreen() {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) { // Firefox
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
                document.documentElement.msRequestFullscreen();
            }
}

openFullscreen()

function setCycleLab(pID, cycle){
	const labelId = `cycle-${pID}`; // Assuming label IDs are cycle-1, cycle-2, etc.
	const label = document.getElementById(labelId);
	if (label){
		label.textContent = '';
	}
	
	const indicesToCheck = [3, 6, 8, 9, 11, 12];
	if (label && !indicesToCheck.includes(pID)) {
		label.textContent = (cycle === 143 || cycle === null || cycle === undefined) ? 'CYCLE' : `CYCLE ${cycle + 1}`;
		console.log("eeee: ", pID, "|", labelId, " Set T: ", label.textContent, "|", cycle)
	}
	if([8,11].includes(pID)){
		label.textContent = "TP";
	}
}

document.querySelector("#drpDDatabase").addEventListener("change", fetchAndUpdateTable);
document.querySelectorAll("#dateP2 input").forEach(input => input.addEventListener("change", fetchAndUpdateTable));

function fetchAndUpdateTable() {
    const panelId = document.querySelector("#drpDDatabase").value;
    const fromDate = document.querySelector("#from-date2").value;
    const toDate = document.querySelector("#to-date2").value;
	//log.i("aa");
    if (!panelId || !fromDate || !toDate) {
        alert("Please select all fields!");
        return;
    }

    // Prepare the request
		fetch("/fetch-data", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ panel_id: panelId, from_date: fromDate, to_date: toDate }),
		})
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert("Error: " + data.error);
                return;
            }
			//console.log(data);
            // Update the table
            const tableBody = document.querySelector("#tDatabase tbody");
            tableBody.innerHTML = ""; // Clear existing rows

            data.forEach(row => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${row.timestamp}</td>
                    <td>${row.fSv}</td>
                    <td>${row.fPv}</td>
                    <td>${row.temperature}</td>
                    <td>${row.cycle}</td>
                    <td>${row.user}</td>
                `;
                tableBody.appendChild(tr);
            });
        })
        .catch(error => console.error("Error fetching data:", error));
}


async function updateCycleLabels() {
    try {
        // Fetch current cycle data from Flask endpoint
        const response = await fetch('/get_current_cycles');

        if (!response.ok) {
            throw new Error('Failed to fetch current cycles');
        }

        // Parse the JSON response
        const currentCycles = await response.json();

        // Handle the received current cycles (Example: log them to the console)
        console.log('Current Cycles:', currentCycles);

        // Update the UI or perform actions with the data
        currentCycles.forEach((cycle, index) => {
            setCycleLab(index+1, cycle);
        });
		
    } catch (error) {
        console.error('Error fetching current cycles:', error);
    }
}

function setUserPy(user) {
    fetch('/setUserpy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: user }) // Pass the string in the request body
    })
    .then(response => response.json())
    .then(data => console.log(data.message))
    .catch(error => console.error('Error:', error));
}

async function removeUser(username, password) {
    try {
        const response = await fetch('/remove_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const result = await response.json();
        if (response.ok) {
            console.log(result.message);
        } else {
            console.log(result.error || "Failed to remove user");
        }
    } catch (error) {
        console.error("Error removing user:", error);
    }
}


async function addUser(username, password) {
    return fetch('/add_user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(error.error || 'Error adding user');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log(`User ${username} added successfully:`, data);
    })
    .catch(error => {
        console.error(`Failed to add user ${username}:`, error.message);
    });
}


async function fetchUsers() {
    try {
        const response = await fetch('/get_users');
        const users = await response.json();
        console.log("Users:", users);
        return users;
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}



async function updateDropdown() {
	userDrop.innerHTML = ""; // Clear existing options
	const defaultOption = document.createElement("option"); 
	defaultOption.value = "defaultUser"; 
	defaultOption.textContent = "Select User"; 
	userDrop.appendChild(defaultOption); 
    const users = await fetchUsers();
    
    users.forEach(user => {
        const option = document.createElement("option");
        option.value = user;
        option.textContent = user;
        userDrop.appendChild(option);
    });
	userDrop.value = "defaultUser";

    // Add default user if not present
    
}
async function addUsersSequentially() {
	console.log("a1");
    await addUser("User1", "P1");
    await addUser("User2", "P2");
    await addUser("User3", "P3");
    await addUser("User4", "P4");
	await updateDropdown();
	
	console.log("a1");
}

updateCycleLabels();
updateDropdown();

async function AddUserF() {
    let user = document.getElementById("userInA").value;
    let password = document.getElementById("passwordInA").value;
    await addUser(user, password);
	await updateDropdown();
}

async function RemoveUserF() {
    let user = document.getElementById("userInA").value;
    let password = document.getElementById("passwordInA").value;
    await removeUser(user, password);
	await updateDropdown();
}
let fetchInterval = 30000;  

function SetTimerF() {
    let upDel = document.getElementById("RefreshIn").value;
    fetchInterval = upDel*1000;
	fetch('/updateDelV', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: upDel }) // Pass the string in the request body
    })
    .then(response => response.json())
    .then(data => console.log(data.message))
    .catch(error => console.error('Error:', error));
	
}
function fetchInt() {
    fetch('/get-int')
        .then(response => response.json())
        .then(data => {
            console.log("Received Integer:", data.value);
			fetchInterval = data.value *1000;
        })
        .catch(error => console.error("Error fetching data:", error));
}

// Call function whenever needed
fetchInt();
//addUsersSequentially();

// Add an event listener to handle user selection changes
userDrop.addEventListener("change", async () => {
	const selectedUser = userDrop.value;
	if (selectedUser === "defaultUser") {
        return; // No password prompt for the default user
    }

	// Prompt for the password
	const enteredPassword = prompt(`Enter password for ${selectedUser}:`);

	// Validate the password
	try {
        // Send the selected user and entered password to the server for validation
        const response = await fetch('/validate_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: selectedUser, password: enteredPassword }),
        });

        const result = await response.json();

        if (response.ok && result.valid) {
			setUserPy(userDrop.value);
            alert("Access granted!");
        } else {
            alert("Incorrect password!");
            userDrop.value = "defaultUser";
        }
    } catch (error) {
        console.error("Error validating user:", error);
        alert("An error occurred while validating the user. Reverting to default user.");
        userDrop.value = "defaultUser";
    }
});

// Iterate over each <td> element
//tableCells.forEach(cell => {
 //   cell.title = cell.textContent.trim(); // Set the title to the cell's text content
//}); 2 5 7 8 10 11

const myList2 = ["6k Vessel 1","8k Vessel 1", "", "6k Vessel 2","8k Vessel 2", "","6k Vessel 3","12k Vessel 1", "","6k Vessel 4","12k Vessel 2", "",];
let intervalId = null;
function timeToSeconds(timeStr) {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  const timeC = hours * 3600 + minutes * 60 + seconds;
  //console.log("Tot Sec:", timeC, " | ", timeStr);
  return timeC;
}

function secondsToDDHHMMSS(totalSeconds) {
	//console.log("Tot Sec Day:", totalSeconds);
	const days = Math.floor(totalSeconds / 86400);
	totalSeconds %= 86400;
	const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
	totalSeconds %= 3600;
	const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
	const seconds = String(totalSeconds % 60).padStart(2, '0');

	return `${days}:${hours}:${minutes}:${seconds}`;
}

function calculateTotalTime(rows) {
	let totalSeconds = 0;

	rows.forEach((row, rI )=> {
	const fifthLastCell = row.cells[row.cells.length - 4];
	if(rI === rows.length-1){
		//console.log("RiiiA: ", rI);
		return; //secondsToDDHHMMSS(totalSeconds);
	}
	if (fifthLastCell) {
	  const timeStr = fifthLastCell.textContent.trim();
	  //console.log("Riii: ", rI);
	  totalSeconds += timeToSeconds(timeStr);
	}
	});
	//console.log("End");
	return secondsToDDHHMMSS(totalSeconds);
}

function getTimeDifference(timeStr, currentTimeStr = getCurrentTime()) {
	const time1 = timeToSeconds(timeStr);
	const time2 = timeToSeconds(currentTimeStr);
	//let diffInSeconds = Math.abs(time2 - time1);
	const SECONDS_IN_A_DAY = 24 * 3600;
	let diffInSeconds;
	if (time2 < time1) {
	// If time2 is earlier than time1, assume time2 is on the next day
	diffInSeconds = (time2 + SECONDS_IN_A_DAY) - time1;
	} else {
	diffInSeconds = time2 - time1;
	}
	// Convert back to hh:mm:ss
	const hours = String(Math.floor(diffInSeconds / 3600)).padStart(2, '0');
	diffInSeconds %= 3600;
	const minutes = String(Math.floor(diffInSeconds / 60)).padStart(2, '0');
	const seconds = String(diffInSeconds % 60).padStart(2, '0');

	return `${hours}:${minutes}:${seconds}`;
}

function getDate(){
	const today = new Date();

// Format the date as DD:MM:YYYY
	const day = String(today.getDate()).padStart(2, '0');
	const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
	const year = today.getFullYear();
	console.log("Date:");
	// Combine into the desired format
	return `${day}:${month}:${year}`;
	
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}


let rows = document.querySelectorAll('#batchT tbody tr');
let Heads = HeadingAll.querySelectorAll('tr');
console.log("Rows len", rows.length);
const cycleAllBody = document.querySelector('#cycleAll');
const cyclekBody = document.querySelector('#cycle8k');

rows.forEach((row, rI) => {
  // Check the rowspan of the first cell
  const cells = row.cells;
  if (rI === 27 || rI === 32) {
        return; // Skips this iteration and continues with the next row
    }
  const cellEv = cells[cells.length - 7]
  const cellQty = cells[cells.length - 3]
  const celRemark = cells[cells.length - 2]
  if (cells.length < 7){
	  console.log("Len Error: "+ cells.length+" Row: "+rI);
	  return;
  }
  
  
  // Add a pointer cursor to indicate clickability
  cellQty.style.overflow = 'hidden';        // Hide overflow
  cellQty.style.textOverflow = 'ellipsis'; // Add ellipsis for overflow
  cellQty.style.whiteSpace = 'nowrap';  
  celRemark.style.overflow = 'hidden';        // Hide overflow
  celRemark.style.textOverflow = 'ellipsis'; // Add ellipsis for overflow
  celRemark.style.whiteSpace = 'nowrap';  
  //cellEv.style.cursor = 'pointer';
  cellQty.style.cursor = 'pointer';
  celRemark.style.cursor = 'pointer';
  cellQty.addEventListener("click", () => makeEditable(cellQty, rI, cells.length - 3));
  celRemark.addEventListener("click", () => makeEditable(celRemark, rI, cells.length - 2));
  
  // Add click event listener
  //cellEv.addEventListener('click', () => {
	//console.log("Clicked"+rI);
    //handleClickEventT(rI, row, cellEv, cells.length - 7 );
    // Additional actions can be performed here
  //});
});

function getCCycle(cEvent) {
	if (cEvent >= 0 && cEvent <= 5) {
	return 0;
	} else if (cEvent >= 6 && cEvent <= 9) {
	return 1;
	} else if (cEvent >= 10 && cEvent <= 13) {
	return 2;
	} else if (cEvent >= 14 && cEvent <= 17) {
	return 3;
	} else if (cEvent >= 18 && cEvent <= 21) {
	return 4;
	} else if (cEvent >= 22 && cEvent <= 27) {
	return 5;
	} else {
	return -1; // Return -1 for invalid cEvent values
	}
	
}

let fSvL = [];
let tSvL = [];

function updateFrequency() {
    for (let i = 1; i <= 11; i++) { // Update for panel[0] values from 1 to 10
        let frequencySpan = document.getElementById(`friq${i}`);
        if (frequencySpan) {
            let value = fSvL[i - 1];
            const isValueProp = (value !== null && value !== undefined && !isNaN(value) && value >= 5 && value <= 200)
            frequencySpan.textContent = isValueProp ? value : "OR!";

        }
		else{
			console.log("Error Friq");
		}
    }
}

// Function to update temperature spans
function updateTemperature() {
    // const validPanels = [1, 2, 4, 5, 7, 8, 10, 11]; // Valid panel[0] values for temperature
    panel_to_index = {1: 0, 4: 1, 7: 2, 10: 3, 8: 4, 11: 5, 3: 6, 6: 7}

    for (let i = 1; i <= 11; i++) {
        // panel = i;
        let tempSpan = document.getElementById(`Temp${i}`);
        if (tempSpan) {
            tempSpan.textContent = tSvL[i]; // Update content from tSvL
        }
		else{
			console.log("Error Temp");
		}
    }
}

function setRelay(state, curPanel) {
    fetch('/setRelay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, curPanel })
    });
}

function getAllSv() {
    fetch('/getAllSv')
        .then(response => response.json())
        .then(data => {
            fSvL = data.fSvL;
            tSvL = data.tSvL;
            console.log("Received fSvL: ", fSvL, "tSvL: ", tSvL);
			updateFrequency();
			updateTemperature();
        })
        .catch(error => console.error('Error fetching data:', error));
}

getAllSv();

	

function setTemp(temp, curPanel) {
    fetch('/setTemp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp, curPanel })
    });
}

function setFriq(friq, curPanel) {
    fetch('/setFriq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friq, curPanel })
    });
}

function onVfd(state, curPanel) {
    fetch('/onVfd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, curPanel })
    });
}



function handleClickEventT(rowIndex, strCall) {
	//cell.style.color = 'green';
	if(cEvent==143 && cCycle == 143){
		return;
	}
	console.log("RowI:",rowIndex, strCall);
	row = rows[rowIndex];
	cells = row.cells;
	cell = cells[cells.length-7];
	cellStT = cells[cells.length-6];
	cellStpT = cells[cells.length-5];
	cellDifT = cells[cells.length-4];
	cellUsr = cells[cells.length-1];
	if([8,11].includes(cPanel)){
		cellCheck = cells[0];
		values = getSelectValues(cellCheck);
		if(values.includes("0")){
			return;
		}
	}
	let loading = false;
	if([1, 4, 7, 10].includes(cPanel) && rowIndex ===1){
		console.log("Loading");
		loading = true;
		//console.log(cells[cells.length-2].textContent);
		//console.log(cells[cells.length-3].textContent);
	}
	
	if (cell.style.color === 'green') {
		if(loading){
			if(cells[cells.length-2].textContent === "--" || cells[cells.length-2].textContent == "" || cells[cells.length-3].textContent === "" || cells[cells.length-3].textContent === "--"){
				console.log("Empty not Work");
				return;
			}
			setRelay(false, cPanel);
		}
        clearInterval(intervalId); // Stop the time difference update
		intervalId = null;
		cEvent = rowIndex+1;
        cell.style.color = 'black'; // Reset color to black
		if (rowIndex < rows.length-2) {
			const rowB = rows[rowIndex + 1]; // Get the previous row
			const cI2 = rowB.cells.length-7;
			const cellB = rowB.cells[cI2]; // Get the cell above in the same column
			cellB.style.cursor = 'pointer';
			cellB._clickHandler = () => handleClickEventT(rowIndex+1, "On Green B");
			cellB.addEventListener('click', cellB._clickHandler);
			//console.log("Added E1: ", cellB);
		}
		
        //row.cells[cellI + 1].textContent = ; // Set the "-" cell to current time
        cellStpT.textContent = getCurrentTime(); // Reset the value of the next cell to "-"
        pCycle = cCycle;
		cCycle = getCCycle(cEvent);
		if(pCycle < cCycle){
			console.log("Cycle CC:", cCycle);
			saveBatchToDatabase(cPanel, cBatch, cBatchAll.endTime, true);
		}
		setCycleLab(cPanel, cCycle);
		if(cEvent>rows.length-2){
			cEvent = rows.length-2;
			updateLastRow();
		}
		console.log("cEvent: Made black", cEvent);
		return;
    }
	console.log("InterWal ID:", intervalId);
	console.log("cColor :", cell.style.color);
	console.log("Ev and RI :", cEvent, " | ", rowIndex);
	if (!intervalId===null){
		clearInterval(intervalId); // Stop the time difference update
		intervalId = null;
	}
	console.log(!(cell.style.color === 'gray'), " | ", !intervalId, " | ",  cEvent>=rowIndex);
	if (!(cell.style.color === 'gray') && !intervalId && cEvent>=rowIndex){
		if(loading){
			setRelay(true, cPanel);
		}
		const currentTime = getCurrentTime();
		const timeRegex = /^\d{2}:\d{2}:\d{2}$/; // Regular expression for hh:mm:ss format
		if(strCall==="From PopupClick" && [8,11].includes(cPanel) && !timeRegex.test(cellStT.textContent)){
			return;
		}
		if (!timeRegex.test(cellStT.textContent)) {
			cellStT.textContent = currentTime;
		} 
		// First-time click logic
		cEvent = rowIndex;
		console.log("cEvent11: Made green", cEvent);
		cell.style.color = 'green'; // Change the color of the clicked cell to green
		const pCycle = cCycle;
		cCycle = getCCycle(cEvent);
		//console.log("Cycle CC:", cCycle, pCycle);
		setCycleLab(cPanel, cCycle);
		//row.cells[cellI - 1].style.color = 'gray'; // Change the color of the cell above it to gray
		if (rowIndex > 0) {
			const rowAbove = rows[rowIndex - 1]; // Get the previous row
			const cI2 = rowAbove.cells.length-7;
			const cellAbove = rowAbove.cells[cI2]; // Get the cell above in the same column
			cellAbove.style.color = 'gray'; // Change the color to gray
			cellAbove.style.cursor = 'default';
			cellAbove.removeEventListener("click", cellAbove._clickHandler);
			if([8,11].includes(cPanel)){
				lockSelects(rowAbove.cells[0]);
			}
			//console.log("Removed Above: ", cellAbove);
		}
		if (rowIndex < rows.length-2) {
			const rowB = rows[rowIndex + 1]; // Get the previous row
			const cI2 = rowB.cells.length-7;
			const cellB = rowB.cells[cI2]; // Get the cell above in the same column
			cellB.style.cursor = 'default';
			//console.log("rem Row Bellow: ", rowIndex);
			cellB.removeEventListener("click", cellB._clickHandler);
			//console.log("Removed Bellow: ", cellB);
		}
		// Set the next cell (current time)
		cellStpT.textContent = "-"; // Set the cell after that to "-"
		cellUsr.textContent = userDrop.value;
		//console.log("loc1");userDrop.value
		// Start updating the time difference every second
		intervalId = setInterval(() => {
			
			// Calculate the time difference
			const timeDifference = getTimeDifference(cellStT.textContent);
			
			// Update the time difference cell
			cellDifT.textContent = timeDifference;
			//console.log("Cell Diff: ", cellDifT);
		}, 1000);
		//console.log("loc2");
	}
	
}



function sideBarToggleWork(bt){
	const items = document.querySelectorAll('.sidebar ul li');
	const sideBarArea = document.getElementById('sideBarArea');
    items.forEach((li) => {
		if(li != bt){
			li.classList.remove('active');
		}
    });
	bt.classList.toggle('active');
	hamBt = document.getElementById('hemBt');
	if(bt.classList.contains('active')){
		hamBt.style.pointerEvents = "none";
		sideBarArea.classList.add('active');
	}
	else{
		hamBt.style.pointerEvents = "auto";
		sideBarArea.classList.remove('active');
	}
	sideBarBt1.style.display = 'none';
	sideBarBt2.style.display = 'none';
	sideBarBt3.style.display = 'none';
	sideBarBt4.style.display = 'none';
	sideBarBt5.style.display = 'none';
}

function SettingBt(bt){
	sideBarToggleWork(bt);
	if(bt.classList.contains('active')){
		sideBarBt1.style.display = 'flex';
	}
	else{
		sideBarBt1.style.display = 'none';
	}
	
}

function IO_stateBt(bt){
	sideBarToggleWork(bt);
	if(bt.classList.contains('active')){
		sideBarBt2.style.display = 'flex';
	}
	else{
		sideBarBt2.style.display = 'none';
	}
	
}

async function fetchBatches(tableId, startDate, endDate) {
    const response = await fetch('/get_batcheList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            table_id: tableId,
            start_date: startDate,
            end_date: endDate
        })
    });

    const data = await response.json();
	console.log("Data Batch: ", data);
    updateTable(data);
}

function updateTable(data) {
    const tbody = document.getElementById('tBatchList');
    tbody.innerHTML = ''; // Clear existing rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        const tdBatchName = document.createElement('td');
        tdBatchName.textContent = row[0]; // batch_name
		const drpDBatchList = document.getElementById('drpDBatchList');
		tdBatchName.onclick = () => {
			togglePopup(panelID = parseInt(drpDBatchList.value, 10), batchIDT = row[0], loadOnly = true);
		};
        tr.appendChild(tdBatchName);
        const tdStartDate = document.createElement('td');
        tdStartDate.textContent = row[1]; // start_time togglePopup(panelID =  cPanel, batchIDT="", loadOnly = false)
        tr.appendChild(tdStartDate);
        tbody.appendChild(tr);
		
    });
}

function refreshBatchData(){
	const drpDBatchList = document.getElementById('drpDBatchList');
	console.log("From Date", document.getElementById('from-date').value)
	fetchBatches(parseInt(drpDBatchList.value, 10), document.getElementById('from-date').value, document.getElementById('to-date').value);
}
function handleBlur(inputElement) {
    inputElement.type = 'text';
	refreshBatchData();
}


function batchHisBt(bt){
	sideBarToggleWork(bt);
	
	if(bt.classList.contains('active')){
		sideBarBt3.style.display = 'block';
		refreshBatchData();
	}
	else{
		sideBarBt3.style.display = 'none';
	}
}

function dataBaseHis(bt){
	sideBarToggleWork(bt);
	
	if(bt.classList.contains('active')){
		sideBarBt4.style.display = 'block';
		fetchAndUpdateTable();
	}
	else{
		sideBarBt4.style.display = 'none';
	}
}

function Maintenance(bt){
	sideBarToggleWork(bt);
	
	if(bt.classList.contains('active')){
		sideBarBt5.style.display = 'flex';
	}
	else{
		sideBarBt5.style.display = 'none';
	}
}

function toggleButtonState(button) {
	button.classList.toggle('active');
}
function toggleIndicator(checkbox, pId) {
	if (userDrop.value === "defaultUser"){
		checkbox.checked = false;
		return;
	}
	const indicator = checkbox.closest('.top-bar2').querySelector('.indicator');
	onVfd(checkbox.checked, pId);
	if (checkbox.checked) {
		indicator.style.backgroundColor = '#7CFC00'; // Toggle on state
	} else {
		indicator.style.backgroundColor = 'red'; // Toggle off state
	}
	//if([8,11].includes(pId)){
	//	togglePopup(pId)
	//}
	
	
}

function togglePopup2(endTime = cBatchAll.end_time) {
	const popup = document.getElementById('popup');
	saveBatchToDatabase(cPanel, cBatch, endTime);
	popup.style.display = popup.style.display === 'none' || popup.style.display === '' ? 'flex' : 'none';
	
}

// Remove the 'Z' to match Python's `datetime.now().isoformat()` cTime local 2024-12-15T07:08:50.662
//console.log("cTime local", currentLocalTime);
function yesButton(){
	cCycle = 143;
	cEvent = 143;
	setCycleLab(cPanel, cCycle);
	endTime = new Date();
	togglePopup2(endTime);
	openConfirmation();
}

function noButton(){
	openConfirmation();
}

function saveValue(cell, input, rI, cellI) {
	const newValue = input.value;
	//const indexes = getRowAndColumnIndexes(cell);
	// sendDataToEsp(cell, bt.checked);
	cell.innerHTML = '';
	const cellWidthVW = (cell.offsetWidth / window.innerWidth) * 100 + "vw";
    const cellHeightVW = (cell.offsetHeight / window.innerWidth) * 100 + "vw"; // Use innerWidth for consistent scaling
    cell.style.width = cellWidthVW;
    cell.style.height = cellHeightVW;
	cell .style.maxWidth = cellWidthVW;
	cell.style.padding = ".6vw";
	cell.style.overflow = 'hidden';        // Hide overflow
	cell.style.textOverflow = 'ellipsis'; // Add ellipsis for overflow
	cell.style.whiteSpace = 'nowrap';
	cell.innerText = newValue; 
	//cell.style.padding = "8px";
	cell.title = cell.textContent.trim();
}

function makeEditable(cell, rI, cellI) {
	console.log("Ent0");
	if (cell.querySelector("input")) return;
	const value = cell.innerText;
	const cellWidthVW = (cell.offsetWidth / window.innerWidth) * 100 + "vw";
    const cellHeightVW = (cell.offsetHeight / window.innerWidth) * 100 + "vw"; // Use innerWidth for consistent scaling
    cell.style.width = cellWidthVW;
    cell.style.height = cellHeightVW;
    cell.style.padding = "0";
	const input = document.createElement("input");
	input.type = "text";
	input.value = value;
	input.style.width = "90%"; // Set input width to 100% of the cell
	input.style.boxSizing = "border-box"; // Ensure input uses cell width exactly
	input.style.height = "90%";
	input.focus();
	input.style.fontSize = getComputedStyle(cell).fontSize; // Match font size with cell
	input.style.textAlign = getComputedStyle(cell).textAlign;
	function handleBlur() {
		saveValue(cell, input, rI, cellI); // Call save function
		input.removeEventListener("blur", handleBlur); // Remove listener after first call
	}
	input.addEventListener("blur", handleBlur);
	input.addEventListener("click", (event) => event.stopPropagation());
	input.addEventListener("keypress", (e) => {
	if (e.key === 'Enter') {
		input.removeEventListener("keypress", arguments.callee); // Remove listener after first call
		input.removeEventListener("blur", handleBlur);
		saveValue(cell, input,  rI, cellI); // Call save function 
		console.log("Ent");
	}
	});
	cell.innerHTML = '';
	cell.style.maxWidth = "100%";
	cell.appendChild(input);
	input.focus();
}



function updateLastRow(){
	const rowB = rows[rows.length-1]; 
	const ClBtStT = rowB.cells[1]; // Get the cell above in the same column
	const ClBtStpT = rowB.cells[2];
	const ClBtDur = rowB.cells[3];
	const tTime = calculateTotalTime;
	const rowSt = rows[0]; 
	const tStart = rowSt.cells[rowSt.cells.length-6];
	const rowUnloading = rows[rows.length-2]; 
	const UnstpCell = rowUnloading.cells[rowUnloading.cells.length-5];
	const tCell = rowUnloading.cells[rowUnloading.cells.length-5];
	console.log("T:: Cell", tCell);
	ClBtStT.textContent = tStart.textContent;
	ClBtStpT.textContent = UnstpCell.textContent;
	ClBtDur.textContent = calculateTotalTime(rows);
}

function getTimeDifferenceInDHMS(startDate, endDate = new Date()) {
    // Calculate the difference in milliseconds
    let diffInMilliseconds = Math.abs(endDate - startDate);

    // Convert the difference to total seconds
    let totalSeconds = Math.floor(diffInMilliseconds / 1000);

    // Calculate days, hours, minutes, and seconds
    const days = Math.floor(totalSeconds / (24 * 3600));
    totalSeconds %= (24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Format the result as dd:hh:mm:ss
    const formattedDiff = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return formattedDiff;
}
function lockSelects(cell) {
    const selects = cell.querySelectorAll('select');
    selects.forEach(select => select.disabled = true);
}

function unLockSelects(cell) {
    const selects = cell.querySelectorAll('select');
    selects.forEach(select => select.disabled = false);
}

function setSelectOptions(cell, int1, int2) {
    // Get all <select> elements in the cell
    const selects = cell.querySelectorAll('select');

    if (selects.length < 2) {
        console.error('The cell does not have two select elements.');
        return;
    }

    // Set the value for each <select>
    selects[0].value = int1 || "0"; // Default to "0" if int1 is 0
    selects[1].value = int2 || "0"; // Default to "0" if int2 is 0
}

function getSelectValues(cell) {
    const selects = cell.querySelectorAll('select'); // Find all <select> elements in the cell
    const values = [];

    selects.forEach(select => {
        values.push(select.value); // Push the value of each <select> to the array
    });

    return values; // Return an array of values
}
let timeUpdateInterval = null;
function clearCells(){
	rows.forEach(row => {
    // Select all cells (td) in the current row
		const cells = row.querySelectorAll('td');
		const startIndex = Math.max(0, cells.length - 6);
		//console.log("st: ", startIndex, " | ", cells[cells.length - 7]);
		if(cells.length>=7 ){
			if([8,11].includes(cPanel)){
				unLockSelects(cells[0]);
			}
			cells[cells.length - 7].style.color = 'black';
			cells[cells.length - 7].style.cursor = 'default';
			cells[cells.length - 7].removeEventListener("click", cells[cells.length - 7]._clickHandler);
			// Clear the text content of each cell

		}
		console.log("ClearCell", "row len", cells.length);
		for (let i = startIndex; i < cells.length; i++) {
			if (i === 0) {
				continue;  // Skip the current iteration when i == 0
			}
			cells[i].textContent = '--';
		}
	});
	if (!(intervalId===null)){
		clearInterval(intervalId); // Stop the time difference update
		intervalId = null;
	}
    if (timeUpdateInterval !== null) {
        clearInterval(timeUpdateInterval);  // Stop updating totalTime when clearing cells
        timeUpdateInterval = null;
    }
}
function startTotalTimeUpdate(startTime) {
    if (timeUpdateInterval !== null) {
        clearInterval(timeUpdateInterval);
    }

    timeUpdateInterval = setInterval(() => {
        const totalTime = document.getElementById('TotalTime');
        const timeDiff = getTimeDifference(startTime);
        totalTime.textContent = "Total Batch Time: " + timeDiff;
    }, 1000);
}

function updateBatch(bData) {
	clearCells();
	cBatch = bData.batch_id;
	cEvent = bData.cEvent;
	cCycle = bData.current_cycle;
	cBatchName  = bData.batch_name;
	cBatchAll = bData;
    // Update batch info in designated HTML elements
    const batchName = document.getElementById('BatchName');
    const startTime = document.getElementById('startTime');
    const totalTime = document.getElementById('TotalTime');

    batchName.textContent = bData.batch_name; 
    if (bData.start_time) {
        const date = new Date(bData.start_time);
        const formattedDate = `Date: ${String(date.getDate()).padStart(2, '0')}:${String(date.getMonth() + 1).padStart(2, '0')}:${date.getFullYear()}`;
        startTime.textContent = formattedDate;
        startTotalTimeUpdate(bData.start_time);
    } else {
        startTime.textContent = "Date: -";
    }
	

    // Update table rows with the JSON data
    const tableData = bData.data; // Assuming bData.data is an array of 28 rows with 5 columns each
	
    if (!Array.isArray(tableData) || tableData.length < rows.length) {
        console.error("Invalid table data format: "+ tableData.length+" | "+tableData);
		console.log("Type of tableData:", typeof tableData, " | ", rows.length);
        return;
    }

    rows.forEach((row, rowIndex) => {
        if (rowIndex < rows.length-1) {
			
            const cells = row.querySelectorAll('td');
			//console.log("Cells: ", cells);
			if(rowIndex===cEvent){ 
				cells[cells.length - 7].style.cursor = 'pointer';
				cells[cells.length - 7]._clickHandler = () => handleClickEventT(rowIndex, "From For Each");
				cells[cells.length - 7].addEventListener('click', cells[cells.length - 7]._clickHandler);
				
			}
			if(rowIndex < cEvent){
				cells[cells.length - 7].style.color = 'gray'; 
				cells[cells.length - 7].style.cursor = 'default';
				cells[cells.length - 7].removeEventListener("click", cells[cells.length - 7]._clickHandler);
				cells[cells.length - 6 + 2].textContent = getTimeDifference(tableData[rowIndex][0],tableData[rowIndex][1]);
				if([8,11].includes(cPanel)){
					lockSelects(cells[0]);
				}
			}
            cells[cells.length - 6 + 0].textContent = tableData[rowIndex][0] || "NaN";
			cells[cells.length - 6 + 1].textContent = tableData[rowIndex][1] || "NaN";
			
			cells[cells.length - 6 + 3].textContent = tableData[rowIndex][2] || "NaN";
			cells[cells.length - 6 + 4].textContent = tableData[rowIndex][3] || "NaN";
			cells[cells.length - 6 + 5].textContent = tableData[rowIndex][4] || "NaN";
			
			if([8,11].includes(cPanel)){
				const int1 = (tableData[rowIndex][5] === "-" || tableData[rowIndex][5] === "--") ? "0" : tableData[rowIndex][5] || "0";
				const int2 = (tableData[rowIndex][5] === "-" || tableData[rowIndex][5] === "--") ? "0" : tableData[rowIndex][6] || "0";
				setSelectOptions(cells[0], int1, int2);
			}
        }
		else{
			return;
		}
    });
	let totalTimeV = "-";
 	const DwnBt =  document.getElementById('DwnBt');
	const FinishBt =  document.getElementById('funishBt');
	if(cCycle === 143 && cEvent === 143){
		DwnBt.style.display = 'block';
		FinishBt.style.display = 'none';
		totalTimeV = getTimeDifferenceInDHMS(new Date(bData.start_time), new Date(bData.end_time));
		updateLastRow();
	}
	else{
		FinishBt.style.display = 'block';
		DwnBt.style.display = 'none';
	}
	
    totalTime.textContent = "Total Batch Time: "+ totalTimeV;
	
	
}

async function saveBatchToDatabase(tID, batchID, endTime = cBatchAll.end_time, cycleChange = false) {
    const tableData = [];
	const total_time = document.getElementById('TotalTime');
	clearInterval(intervalId); // Stop the time difference update
	intervalId = null;
    // Collect data from table rows
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells)
		.filter((cell, index, array) => {
			const reversedIndex = array.length - 1 - index; // Reverse index to count from the end
			return [0, 1, 2, 4, 5].includes(reversedIndex); // Match indices from the end
		})
		.map(cell => cell.textContent || "-");
		
		if([8,11].includes(cPanel) ){
			// Get the last cell (assuming it contains the <select> elements)
			const lastCell = cells[0];
			// Get selected values from the <select> elements in the last cell
			const selectValues = getSelectValues(lastCell);
			// Append these values to the rowData
			rowData.push(...selectValues);
		}
		tableData.push(rowData);
    });
	

    // Prepare the payload
    const payload = {
		table_ID: tID,
        batch_id: batchID,
		total_time: total_time.textContent,
        data: tableData,
		endTime:endTime,
		cEvent: cEvent,
		current_cycle: cCycle
    };
	if(!cycleChange){
		clearCells();
	}

    try {
        // Send the data to the server
        const response = await fetch('/update_batch_dataBase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
			if(cycleChange){
				fetch('/updateCycles', { method: 'POST' })
					.then(response => response.json())
					.then(data => console.log(data.message))
					.catch(error => console.error('Error:', error));
				
			}
            alert("Batch data updated successfully!");
        } else {
            console.error(result.error || "Failed to update batch data");
            alert("Error updating batch data");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to send data to the server");
    }
}



// Call the function
function downloadTableAsCSV() {
    const csvRows = []; // Array to hold CSV rows
	let csvNam;
    // 1. Add popup-bar data
    const popupBar = document.querySelector(".popup-bar");
    const popupData = [];
    if (popupBar) {
        const spans = popupBar.querySelectorAll("span");
		csvNam = spans[0]?.textContent || "UnknownName";
        popupData[0] = csvNam; // 1st span to 1st cell
        popupData[2] = spans[1]?.textContent || ""; // 2nd span to 3rd cell
        popupData[4] = spans[2]?.textContent || ""; // 3rd span to 5th cell
        popupData[7] = spans[3]?.textContent || ""; // 4th span to 10th cell
    }
    csvRows.push(popupData);

	// 2. Add global Heads as headings

	Heads.forEach(row => {
		Heads2 = Array.from(row.querySelectorAll("th"));
		console.log("Heads : ", Heads2, Heads);
		if (Heads2.length) {
			csvRows.push(Heads2.map(head => head.textContent.trim())); // Use Heads for headings
		}
	});

	// 3. Add all rows from the global rows object
	rows.forEach(row => {
		const csvRow = Array.from(row.querySelectorAll("td")).map(cell => {
			const selects = cell.querySelectorAll("select");
			if (selects.length === 2) {
				// Format: select1.option-select2.option
				const option1 = selects[0].options[selects[0].selectedIndex].text;
				const option2 = selects[1].options[selects[1].selectedIndex].text;
				return `${option1}-${option2}`;
			} else if (selects.length === 1) {
				// Single select
				return selects[0].options[selects[0].selectedIndex].text;
			} else {
				// Simple cell with text
				return cell.textContent.trim();
			}
		});
		csvRows.push(csvRow);
	});

    // 4. Convert to CSV string
    const csvContent = csvRows.map(r => r.map(cell => `"${cell || ''}"`).join(",")).join("\n");

    // 5. Trigger CSV download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = csvNam + ".csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function togglePopup(panelID =  cPanel, batchIDT="", loadOnly = false) {
	if (userDrop.value === "defaultUser"){
		return;
	}
	const popup = document.getElementById('popup');
	const cycleAll = document.getElementById('cycleAll');
	const cycle8k = document.getElementById('cycle8k');
	const cycle12k = document.getElementById('cycle12k');
	const vName = document.getElementById('vName');
	let bData;
	cPanel = panelID;
	if ([8, 11].includes(panelID)){
		cycleAll.style.display = 'none';
		cycle8k.style.display = 'none';
		cycle12k.style.display = 'table-row-group';
		rows =  cycle12k.querySelectorAll('tr');
		Heads = Heading12k.querySelectorAll('tr');
		Heading12k.style.display = 'table-header-group';
		HeadingAll.style.display = 'none';
	}
	else{
		HeadingAll.style.display = 'table-header-group';
		Heading12k.style.display = 'none';
		Heads = HeadingAll.querySelectorAll('tr');
	}
	if ([2, 5].includes(panelID)){
		//console.log('Button clicked!11');
		cycleAll.style.display = 'none';
		cycle8k.style.display = 'table-row-group';
		rows =  cycle8k.querySelectorAll('tr');
	}
	if(!([2, 5, 8, 11].includes(panelID))){
		cycle12k.style.display = 'none';
		cycleAll.style.display = 'table-row-group';
		cycle8k.style.display = 'none';
		rows =  cycleAll.querySelectorAll('tr');
	}
	console.log("Rows len", rows.length);
	try {
	
		//Fetch the latest batch data for the specified panelID
		let response;
		if (!loadOnly){
			response = await fetch(`/get_latest_batch?table_id=${panelID}`);	
		}
		else{
			
			if(batchIDT==="LoadNext"){
				
				response = await fetch(`/get_batch?table_id=${panelID}&batch_id=${cBatch+1}`);
			}
			else if(batchIDT === "LoadPre"){
				response = await fetch(`/get_batch?table_id=${panelID}&batch_id=${cBatch-1}`)	
			}
			else{
				response = await fetch(`/get_batch?table_id=${panelID}&batch_name=${batchIDT}`);	
			}
			
			
		}
		if (!response.ok) {
			
			throw new Error('Failed to fetch batch data');
			return;
		}
		bData = await response.json();
		updateBatch(bData);
		// Log all the data to the console
		console.log('Batch Data:', bData);
			
	} catch (error) {
		console.error('Error loading batch data:', error);
		return;
    }
	
	const batchN = 1;
	vName.textContent = myList2[panelID-1] ;
	//if(![8, 11].includes(panelID)){
	handleClickEventT(cEvent, "From PopupClick");
	
	
	console.log(panelID);
	//popup.style.display = popup.style.display === 'none' || popup.style.display === '' ? 'flex' : 'none';
	popup.style.display = 'flex';

	
}

function toggleCycle(element) {
	element.classList.toggle("active");
}

function toggleInput(element) {
	const svLabel = element; // Get the clicked label
	const svInput = svLabel.nextElementSibling; // Get the corresponding input field

	//svLabel.style.display = "none"; // Hide the label
	svInput.style.display = "inline-block"; // Show the input field
	svInput.focus(); // Focus on the input field
}

function updateValue(inputElement, typeIn, pID) {
	
	const svLabel = inputElement.previousElementSibling; // Get the corresponding label
	 // Update the label with input value

    const inputValue = inputElement.value.trim();
    inputElement.style.display = "none";
    // Check if the input value is a valid real number
    if (!/^-?\d+(\.\d+)?$/.test(inputValue)) {
        alert("Invalid input! Please enter a valid number.");
        inputElement.value = ""; // Optionally reset input
        return;
    }

	 // Hide the input field
    svLabel.innerText = inputValue + " ";
	if(typeIn==="friq"){
		setFriq(inputElement.value, pID);
	}
	if(typeIn==="temp"){
		setTemp(inputElement.value, pID);
	}
	//svLabel.style.display = "inline"; // Show the label again
}


function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
	console.log('Button clicked!');
}

// Add event listener for hamburger menu
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.getElementById('hemBt');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMenu);
    }
});



function updateTime() {
	const now = new Date();
	const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	const day = days[now.getDay()];
	const month = months[now.getMonth()];
	const date = now.getDate();
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');

	document.getElementById("current-time").textContent = `${day}, ${month} ${date} ${hours}:${minutes}`;
}
function openConfirmation(){
	const popup = document.getElementById('popup2');
	popup.style.display = popup.style.display === 'none' || popup.style.display === '' ? 'flex' : 'none';
	document.getElementById("warnMsg").textContent = "Confirm to finish Batch #"+cBatchName;

}

function updateDtToPan(updatedData) {
	let Vav = 0.1;
	let Iav = 0.1;
	updatedData.forEach(panel => {
		const panelElement = document.getElementById(`panel-${panel.panel_id}`);

		if (panelElement) {
			// Update Frequency
			const frequencyLabel = panelElement.querySelector(`#pvFriq`);

            if (frequencyLabel) {
                const frequency = panel.frequencyPV != null ? panel.frequencyPV.toFixed(2) : "N/A";
                frequencyLabel.innerText = `PV: ${frequency} Hz`;
            }

            // Update Temperature
            const temperatureLabel = panelElement.querySelector(`#pvTemp`);
            if (temperatureLabel) {
                const temperature = panel.temperature != null ? panel.temperature.toFixed(2) : "N/A";
                temperatureLabel.innerText = `PV: ${temperature} °C`;
            }



			
			// if(panel.panel_id===6){
			// 	Vav = panel.temperature.toFixed(2)
			// }
			if(panel.panel_id===9){
				Iav = panel.temperature.toFixed(2)
				
			}
			if(panel.panel_id===12){
				console.log("Panel D:", panel);
				const VavL = document.getElementById(`Vav`);
				const IavL = document.getElementById(`Iav`);
				const FriqL = document.getElementById(`FriqL`);
				const EnerL = document.getElementById(`Ener`);
				const PowerL = document.getElementById(`Powe`);
				const pfL = document.getElementById(`PowFec`);

                function getValidValue(value, unit) {
                    if (value == null || isNaN(value)) return "--";  // Handle null, undefined, or NaN
                    return typeof value === "number" ? `${value.toFixed(2)} ${unit}` : `${parseFloat(value).toFixed(2)} ${unit}`;
                }

                VavL.innerText = `V: ${getValidValue(panel.user, "V")}`;
                IavL.innerText = `I: ${getValidValue(panel.cycle, "A")}`;
                FriqL.innerText = `F: ${getValidValue(panel.frequencyPV, "Hz")}`;
                EnerL.innerText = `E: ${getValidValue(panel.temperature, "kWh")}`;
                PowerL.innerText = `P: ${getValidValue(panel.fSv, "kW")}`;
                pfL.innerText = `PF: ${getValidValue(panel.state, "")}`;

                // let VavText = parseFloat(panel.user).toFixed(2);
                // let IavText = parseFloat(panel.cycle).toFixed(2);
                //
				// VavL.innerText = `V: ${VavText} V`;
				// IavL.innerText = `I: ${IavText} A`;
				// FriqL.innerText = `F: ${panel.frequencyPV.toFixed(2)} Hz`;
				// EnerL.innerText = `E: ${panel.temperature.toFixed(2)} kWh`;
				// PowerL.innerText = `P: ${panel.fSv.toFixed(2)} kW`;
				// let stateFloat = parseFloat(panel.state).toFixed(2);
				// pfL.innerText = `PF: ${stateFloat}`;
			}
		}
	});
};

// Fetch every 5 seconds

function fetchData() {
    fetch('/latest-data')
        .then(response => response.json())
        .then(data => {
            console.log("Updated Data:", data);
			updateDtToPan(data);
        })
        .catch(error => console.error("Error fetching data:", error));

    setTimeout(fetchData, fetchInterval);
}

fetchData();


setInterval(updateTime, 60000); // Update every minute
updateTime(); // Initialize on load
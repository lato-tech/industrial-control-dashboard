import json
import random
import sqlite3
import threading
import sys
import os
import time
from datetime import datetime

debugB = False
if not debugB:
    from librpiplc import rpiplc


from flask import render_template, Response
from flask import Flask, jsonify, request
from threading import Timer
import queue
from dataBasePy import BatchDatabase
try:
    from modForPLC import ModBusController
    debugN = 11

except Exception as e:
    debugN = 0
    class ModBusController:
        def __init__(self, v1, v2, parityIN='N'):
            pass

if getattr(sys, 'frozen', False):  # If running as a bundled executable
    # The app is running as a frozen executable
    base_path = sys._MEIPASS
else:
    # The app is running as a script (during development)
    base_path = os.path.dirname(os.path.abspath(__file__))

# Set Flask's template and static folder paths

print("aa1")
db = BatchDatabase()
print("aa2")
vNL = [6, 1, 3, 7, 1, 2, 8, 5, 4, 9, 10]
vfdList = [ModBusController("/dev/ttySC2", i) for i in vNL]
MFM = ModBusController("/dev/ttySC2", 11)
RTD = ModBusController("/dev/ttySC3", 1, parityIN='E')
if not debugB:
    rpiplc.init("RPIPLC_V6", "RPIPLC_58")

DATABASE = 'panel_data.db'
db.updateD = db.get_dict_value("updateD")
if db.updateD is None:
    print("Error Dict from DB")
    db.updateD = 30

update_queue = queue.Queue()
panalNameL = ["6k Vessel 1", "8k Vessel 1", "Oven",
              "6k Vessel 2", "8k Vessel 2", "Blender",
              "6k Vessel 3", "12k Vessel 1", "Grinder",
              "6k Vessel 4", "12k Vessel 2", "MFM"]
app = Flask(__name__)
app.template_folder = os.path.join(base_path, 'templates')
app.static_folder = os.path.join(base_path, 'static')


def digital_read_write(rr, boolV):
	outV = rpiplc.LOW
	if(boolV):
		outV = rpiplc.HIGH
	rpiplc.pin_mode(rr, rpiplc.OUTPUT)
	rpiplc.digital_write(rr, outV)
def fetch_sv_data():
    fSvL = [vfd.getSetFriq() for vfd in vfdList]  # Example data [47.5 for _ in range(1, 11)] #
    tSvL = db.get_list() #[98.1 for _ in range(1, 9)] #
    return fSvL, tSvL

@app.route('/setRelay', methods=['POST'])
def set_relay():
    data = request.json
    state = data.get('state')
    curPanel = data.get('curPanel')
    if not curPanel in [1, 2, 3, 4]:
        return
    # Process the received data here
    relList = ['Q0.0', 'Q0.1', 'Q0.2', 'Q1.0']
    print(f"Relay State: {state}, Current Panel: {curPanel}")
    digital_read_write(relList[curPanel-1], state)
    return '', 204

@app.route('/getAllSv', methods=['GET'])
def get_all_sv():
    fSvL, tSvL = fetch_sv_data()
    return jsonify({'fSvL': fSvL, 'tSvL': tSvL})

@app.route('/setTemp', methods=['POST'])
def set_temp():
    data = request.json
    temp = data.get('temp')
    curPanel = data.get('curPanel')
    panel_to_index = db.panel_to_index
    if curPanel in panel_to_index:
        index = curPanel
        current_list = db.get_list()
        while len(current_list) < 11:
            current_list.append(0)
        current_list[index] = temp
        db.startConn()
        db.set_list(db.cursor, current_list)
        db.close()
        print(f"Updated ListTable: {current_list}")
    else:
        print(f"Invalid Panel ID: {curPanel}")
    return '', 204

@app.route('/setFriq', methods=['POST'])
def set_friq():
    data = request.json
    friq = data.get('friq')
    curPanel = data.get('curPanel')
    print(f"Frequency: {friq}, Current Panel: {curPanel}")
    if curPanel>10:
        return '', 204
    vfdList[curPanel].setFriq(friq)
    return '', 204

@app.route('/onVfd', methods=['POST'])
def on_vfd():
    data = request.json
    state = data.get('state')
    curPanel = data.get('curPanel')
    # Process the received data here
    db.stateList[curPanel-1] = "On" if state else "Off"
    if state:
        vfdList[curPanel-1].startMotor()

    else:
        vfdList[curPanel - 1].stopMotor()
    if curPanel in [2,5]:
        out = 'Q0.3' if curPanel == 2 else 'Q0.4'
        digital_read_write('Q0.3', False)
        digital_read_write('Q0.4', False)
        digital_read_write(out, state)
    # if curPanel == 3:
    #     svListT = db.get_list()
    #     onTemp = RTD.getTemp(3)
    #     diff = svListT[6]-onTemp
    #     if diff > 10 and state:
    #         digital_read_write('Q0.5', True)
    #         if diff > 25:
    #             digital_read_write('Q0.6', True)
    #             if diff > 40:
    #                 digital_read_write('Q0.7', True)
    #     else:
    #         digital_read_write('Q0.5', False)
    #         digital_read_write('Q0.6', False)
    #         digital_read_write('Q0.7', False)

    print(f"VFD State: {state}, Current Panel: {curPanel}")
    return '', 204

@app.route('/get-int')
def get_int():
    number = db.get_dict_value("updateD")
    return jsonify({"value": number})


def fetch_latest_panel_data():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # Fetch the maximum update_id (latest update)
    cursor.execute("""
        SELECT MAX(update_id) FROM panel_data
    """)
    latest_update_id = cursor.fetchone()[0]

    # panel_id, update_id, panel_name, cycle, fSv, fPv, temperature, user, state
    cursor.execute("""
        SELECT panel_id, panel_name, cycle, fPv, temperature, fSv, state, user
        FROM panel_data
        WHERE update_id = ?
        ORDER BY panel_id ASC
    """, (latest_update_id,))

    data = cursor.fetchall()
    conn.close()
    return data

def update_database():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Insert into update_data to generate a new update_id
    # cursor.execute("INSERT INTO update_data DEFAULT VALUES")
    local_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')  # Get local time in desired format
    cursor.execute("INSERT INTO update_data (timestamp) VALUES (?)", (local_time,))
    update_id = cursor.lastrowid  # Get the ID of the newly created row in update_data

    # Insert panel data for all 12 panels
    for panel_id in range(1, 13):
        new_temperature = 98.1
        fPV = vfdList[panel_id-1].getFriq() if panel_id <= debugN else round(random.uniform(40, 60), 2)
        # print("fPV:", fPV)
        # time.sleep(1)
        fSV = vfdList[panel_id-1].getSetFriq() if panel_id <= debugN else round(random.uniform(40, 60), 2)
        # time.s-leep(1)
        # print("P:", panel_id, "!", db.panel_to_index)
        # print("fSv:", fSV)
        if panel_id in db.panel_to_index:
            index = db.panel_to_index[panel_id]
            if not debugB:
                new_temperature = RTD.getTemp(index+1)#round(random.uniform(50, 200), 2)
                print("New Temp:", new_temperature)


        # print(fPV, fSV, )
        cN = db.AllCCycles[panel_id-1]#+1 if not db.AllCCycles[panel_id-1] is None else #random.randint(1, 6)
        #ststop = ["START", "STOP"]
        cycleP = f'CYCLE {cN+1}' if cN is not None else 'CYCLE'
        if panel_id == 2 or panel_id == 5:
            # stInt = random.randint(0, 1)
            # cycleP = ststop[stInt]
            cycleP = "CYCLE"

        elif panel_id == 8 or panel_id == 11 or panel_id == 6 or panel_id == 9 or panel_id == 12:
            cycleP = ""
        elif panel_id == 3:
            cycleP = str(random.randint(1, 3))
        lastV = db.stateList[panel_id-1]

        # if panel_id == 6:
        #     if not debugB:
        #         new_temperature =
        # if panel_id == 9:
        #     if not debugB:

        userV = db.user
        if panel_id == 12:
            if not debugB:
                userV = MFM.read_register_in(0x06)# V_Av
                cycleP = MFM.read_register_in(0x16)  # I_Av

                fPV = MFM.read_register_in(0x38)#F
                new_temperature = MFM.read_register_in(0x3A)#E
                fSV = MFM.read_register_in(0x2A)#P
                lastV = MFM.read_register_in(0x36)#PF


        cursor.execute("""
            INSERT INTO panel_data (panel_id, update_id, panel_name, cycle, fSv, fPv, temperature, user, state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (panel_id, update_id, panalNameL[panel_id-1], cycleP, fSV, fPV, new_temperature, userV, lastV))

    conn.commit()
    conn.close()

    print("Data updated for all 12 panels")

def format_data_for_sse(data):
    formatted = [{'panel_id': row[0], 'panel_name': row[1], 'cycle': row[2], 'frequencyPV': row[3], 'temperature': row[4], 'fSv': row[5], 'state': row[6], 'user': row[7]} for row in data]
    # return f"data: {formatted}\n\n"
    return json.dumps(formatted)

@app.route('/latest-data')
def latest_data():
    update_database()
    latest_data = fetch_latest_panel_data()
    formatted_data = format_data_for_sse(latest_data)
    return formatted_data

def fetch_data(panel_id, from_date, to_date):
    print(panel_id, from_date, to_date)
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    query = """
        SELECT
            update_data.timestamp,
            panel_data.fSv,
            panel_data.fPv,
            panel_data.temperature,
            panel_data.cycle,
            panel_data.user
        FROM
            panel_data
        JOIN
            update_data ON panel_data.update_id = update_data.update_id
        WHERE
            panel_data.panel_id = ? AND
            update_data.timestamp BETWEEN ? AND DATETIME(?, '+1 day', '-1 second')
        ORDER BY
            update_data.timestamp ASC;
    """
    cursor.execute(query, (panel_id, from_date, to_date))
    results = cursor.fetchall()
    conn.close()
    # print(results)
    # Format results for JSON
    data = [
        {
            "timestamp": datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%d %H:%M"),
            "fSv": row[1],
            "fPv": f"{row[2]} Hz",
            "temperature": f"{row[3]} °C",
            "cycle": row[4],
            "user": row[5],
        }
        for row in results
    ]
    return data


@app.route('/fetch-data', methods=['POST'])
def get_data():
    request_data = request.json
    panel_id = request_data.get('panel_id')
    from_date = request_data.get('from_date')
    to_date = request_data.get('to_date')

    if not panel_id or not from_date or not to_date:
        return jsonify({"error": "Invalid input"}), 400

    try:
        data = fetch_data(panel_id, from_date, to_date)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/')
def index():
    panel_data = fetch_latest_panel_data()
    return render_template('index.html', panels=panel_data)

@app.route('/setUserpy', methods=['POST'])
def setUserpy():
    input_data = request.json.get('data')  # Retrieve the string from the request
    # Your logic here
    # print(f"Received string: {input_data}")
    db.user = input_data
    return jsonify({'message': f'Received string: {input_data}'})

@app.route('/updateDelV', methods=['POST'])
def setUpdateD():
    input_data = request.json.get('data')  # Retrieve the string from the request
    # Your logic here
    # print(f"Received string: {input_data}")
    db.startConn()
    db.set_dict_variable(db.cursor, "updateD", input_data)
    db.close()
    db.updateD = input_data
    return jsonify({'message': f'Received string: {input_data}'})

@app.route('/refresh')
def refresh():
    panel_data = fetch_latest_panel_data()
    return jsonify(panel_data)

@app.route('/get_latest_batch', methods=['GET'])
def get_latest_batch():
    table_id = request.args.get('table_id', type=int)
    if table_id is None:
        return jsonify({"error": "table_id is required"}), 400
    batch_data = db.get_latest_batch(table_id)
    return jsonify(batch_data)

@app.route('/get_batch', methods=['GET'])
def get_batch():
    table_id = request.args.get('table_id', type=int)
    batch_id = request.args.get('batch_id', type=int)
    batch_name = request.args.get('batch_name', type=str)

    if table_id is None:
        return jsonify({"error": "table_id is required"}), 400
    db.startConn()
    if batch_id is not None:
        batch_data = db.fetch_batch_from_db(db.cursor, table_id, batch_id=batch_id)
        db.close()
    elif batch_name is not None:
        batch_data = db.fetch_batch_from_db(db.cursor, table_id, batch_name=batch_name)
        db.close()
    else:
        db.close()
        return jsonify({"error": "Either batch_id or batch_name is required"}), 400

    if batch_data is None:
        return jsonify({"error": "Batch not found"}), 404
    return jsonify(batch_data)

@app.route('/get_batcheList', methods=['POST'])
def get_batcheList():
    data = request.json
    table_id = data['table_id']
    start_date = data['start_date']
    end_date = data['end_date']
    db.startConn()
    result, _ = db.getBatchesInDateRange(db.cursor, table_id, start_date, end_date)
    db.close()
    return jsonify(result)

@app.route('/get_current_cycles', methods=['GET'])
def fetch_current_cycles():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    current_cycles = db.get_current_cycles(cursor)
    conn.close()
    return jsonify(current_cycles)

@app.route('/updateCycles', methods=['POST'])
def updateCycles():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    db.get_current_cycles(cursor)
    conn.close()
    return jsonify({'message': 'Python function called successfully'})

@app.route('/update_batch_dataBase', methods=['POST'])
def update_batch_data():
    try:
        # Parse the request data
        req_data = request.get_json()
        batch_id = req_data.get('batch_id')
        panel_id = req_data.get('table_ID')
        table_data = req_data.get('data')
        endTime = req_data.get('endTime')
        cCycle = req_data.get('current_cycle')
        cEvent = req_data.get('cEvent')

        if not batch_id or not table_data or not panel_id:
            return jsonify({"error": "Invalid input data"}), 400

        # Serialize the table data back to JSON
        serialized_data = json.dumps(table_data)
        db.startConn()
        db.update_batch_data(db.cursor, batch_id, panel_id, table_data, cCycle, cEvent, endTime)
        db.close()

        return jsonify({"success": True, "message": "Batch data updated successfully"})
    except Exception as e:
        print("Error updating batch data:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/get_users', methods=['GET'])
def get_users():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    users = cursor.execute('SELECT username FROM Users').fetchall()
    conn.close()
    print(users)
    aa1 = [user[0] for user in users]
    return jsonify(aa1)

# Add a user
@app.route('/add_user', methods=['POST'])
def add_user():
    print("Add user")
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    try:
        db.startConn()
        cursor = db.cursor
        cursor.execute('INSERT INTO Users (username, password) VALUES (?, ?)', (username, password))
        db.close()
        return jsonify({"message": "User added successfully"}), 201
    except sqlite3.IntegrityError:
        db.close()
        return jsonify({"error": "User already exists"}), 400


@app.route('/validate_user', methods=['POST'])
def validate_user():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"valid": False, "error": "Missing username or password"}), 400

    try:
        # Connect to the SQLite database
        db.startConn()
        cursor = db.cursor

        # Query the user table to validate the password
        cursor.execute("SELECT password FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()

        if row and row[0] == password:
            return jsonify({"valid": True})
        else:
            return jsonify({"valid": False}), 401
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({"valid": False, "error": "Database error"}), 500
    finally:
        db.close()

# Remove a user
@app.route('/remove_user', methods=['POST'])
def remove_user():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    db.startConn()
    cursor = db.cursor
    user = cursor.execute('SELECT * FROM Users WHERE username = ? AND password = ?', (username, password)).fetchone()
    if user:
        cursor.execute('DELETE FROM Users WHERE username = ?', (username,))
        db.close()
        return jsonify({"message": "User removed successfully"}), 200
    else:
        db.close()
        return jsonify({"error": "Incorrect username or password"}), 403


if __name__ == '__main__':
    # createTable()
    update_database()
    # update_thread = threading.Thread(target=startSim)
    # update_thread.start()
    app.run(host="0.0.0.0",port = 1777, debug=False)


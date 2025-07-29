# Industrial Control Panel Dashboard

Flask-based web application for monitoring and controlling industrial equipment on Raspberry Pi 5.

## 🍓 Raspberry Pi 5 Setup

### Prerequisites
- Raspberry Pi 5 with Raspberry Pi OS
- Python 3.8+
- Hardware: VFDs, RTD sensors, relays

### Installation

1. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd <project-directory>
   ```

2. **Install dependencies**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Install hardware libraries**
   ```bash
   # Install librpiplc (if not already installed)
   pip3 install librpiplc
   ```

4. **Run application**
   ```bash
   cd Python
   python3 main.py
   ```

5. **Access dashboard**
   - Local: `http://localhost:1777`
   - Network: `http://<raspberry-pi-ip>:1777`

## 📁 Project Structure

```
├── Python/
│   ├── main.py              # Main Flask application
│   ├── dataBasePy.py        # Database operations
│   ├── modForPLC.py         # Modbus communication
│   ├── templates/           # HTML templates
│   ├── static/              # CSS, JS, images
│   └── test11.py           # Hardware test
├── ref/                     # Reference files
├── IO_Setup/               # I/O configuration
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## 🔧 Configuration

### Hardware Setup
- Connect VFDs via RS485 (`/dev/ttySC2`)
- Connect RTD sensors (`/dev/ttySC3`)
- Configure Raspberry Pi PLC pins

### Production Settings
```python
debugB = False  # Disable debug mode
debugN = 11     # Number of real devices
```

## 📊 Features

- **12 Industrial Panels**: Real-time monitoring
- **VFD Control**: Motor speed control
- **Temperature Monitoring**: RTD sensor readings
- **Batch Management**: Process tracking
- **User Management**: Multi-user support
- **Data Export**: CSV download

## 🔌 Hardware Integration

- **Modbus RTU**: RS485 communication
- **Raspberry Pi PLC**: Digital I/O
- **VFDs**: Motor control
- **RTD Sensors**: Temperature monitoring

## 🚀 Deployment

1. **Enable auto-start** (optional)
   ```bash
   sudo nano /etc/systemd/system/control-panel.service
   ```

2. **Service file content**
   ```ini
   [Unit]
   Description=Industrial Control Panel
   After=network.target

   [Service]
   User=pi
   WorkingDirectory=/home/pi/your-project/Python
   ExecStart=/usr/bin/python3 main.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable service**
   ```bash
   sudo systemctl enable control-panel
   sudo systemctl start control-panel
   ```

## 📝 Development

- **Debug Mode**: Set `debugB = True` in main.py
- **Logs**: Check console output for debugging
- **Database**: SQLite file created automatically

## 🔒 Security

- Change default passwords
- Configure firewall rules
- Use HTTPS in production

## 📞 Support

For technical support, contact the development team. 
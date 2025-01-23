
# Interactive Arduino Project: Alarm Clock with "Bierpong" Mechanism

A small IoT project to build an interactive clock with unique mechanisms to stop the alarm. It uses an Arduino for I/O and a web application for setup. The alarm is turned off using a "Bierpong"-style task that combines precision and fun.

## Features

- **Arduino-Powered Alarm Clock**: Built with an Arduino MKR1010 WiFi and various hardware components to deliver a complete interactive experience.
- **Frontend and Backend Integration**:
  - A user-friendly web interface for setting the alarm and displaying high scores.
  - Backend hosted on Heroku for data processing and storage.
- **Interactive Shutdown Mechanism**: The alarm stops only when the user completes a task resembling "Bierpong" using ultrasonic sensors.
- **High Score System**: Tracks the time it takes to complete the task and displays it as a high score.

## How It Works

1. **Set the Alarm**: The user sets the alarm time through a website or via an encoder.
2. **Alarm Activation**: When the alarm time is reached, the alarm rings for 5 seconds.
3. **Interactive Shutdown**:
   - Sensor 1 ensures the user is within the required distance (20 cm minimum).
   - Upon validation, a timer starts for the high score calculation.
   - Sensor 2 detects when the "Bierpong" task is completed, stopping the alarm.
4. **High Score Calculation**: The time taken to complete the task is sent to the backend and displayed on the frontend.

## Technologies Used

### Hardware
- **Arduino MKR1010 WiFi**: Microcontroller for system control.
- **Ultrasonic Sensors**: For interaction detection.
- **DF-Player Mini**: Plays alarm sound.
- **KY-040 Encoder**: Input for setting the alarm.
- **TM1637 Display**: Shows time and relevant data.
- **RTC Module**: Provides timekeeping.
- **Green LED**: Gives visual feedback.

### Software
- **Backend**: Hosted on Heroku for seamless communication and data management.
- **Frontend**: Provides an intuitive web interface.
- **Communication Protocols**: Ensures efficient interaction between the Arduino, backend, and frontend.

## Hosting with Heroku

The backend and frontend are deployed on Heroku, providing a scalable and reliable platform for this project. Heroku enables seamless integration and ensures optimal performance.

## Future Improvements

- Enhanced gamification of the shutdown mechanism.
- Detailed analytics for high scores.
- Additional hosting options for increased scalability.

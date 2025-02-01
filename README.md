# SUTD MyPortal to ICS

A simple script that converts the SUTD MyPortal schedule into an `.ics` file, which can be imported into calendar apps.

## How to Use

1. Log in to **MyPortal** and navigate to the **Weekly Schedule** page.
2. Switch to **List View**.
3. Open **Developer Tools**:
   - **MacOS**: Press `Cmd + Opt + I`
   - **Windows**: Press `F12`
4. Go to the **Console** tab.
5. Copy and paste the contents of `script.js` into the console and press **Enter**.
6. A prompt will appear to download an `.ics` file.
7. Import the downloaded `.ics` file into your preferred calendar app.

## A Simpler Method

1. Follow steps **1 to 4** from the previous section.
2. Copy and paste the following command into the **Console**, then press **Enter**:

   ```javascript
   fetch('https://raw.githubusercontent.com/sebasyii/sutd-myportal-to-ics/refs/heads/main/index.js')
   .then(r => r.text())
   .then(eval);
    ```
3. The `.ics` file will be generated and downloaded automatically

Now, you can easily import your schedule. 

windowsExceptions=["krunner","spectacle"]
windowsState={}
debug=false

const Action =
{
    CLOSE: "Close",
    MINIMIZE: "Minimize",
    MAXIMIZE: "Maximize",
    UNMAXIMIZE: "Unmaximize",
    UNMINIMIZED: "Unminimized",
    SHADE: "Shade"
};


const WindowStateStates =
{
    CREATED: "Created",
    MAXIMIZEDINMAINDEKSTOP: "Maximized in main desktop",
    MAXIMIZED: "Maximized",
    UNMAXIMIZED: "Unmaximized",
    MINIMIZED_AND_MAXIMIZED: "Minimized and maximized",
    MINIMIZED_AND_NOT_MAXIMIZED: "Minimized and not maximized"

};


class windowState
{
    constructor()
    {
        this.desktop=1;
        this.state=WindowStateStates.UNITIALIZED
        this.previousHeigth=""
        this.previousWidth=""
        this.previousX=""
        this.previousY=""
        this.hasBorders=""
    }
};


function log(msg)
{
    if(debug == true)
        print("KMacsimize: " + msg);
}


function managedWindow(client)
{
    if(client.normalWindow==true  && windowsExceptions.includes(client.resourceClass)==false )
        return true;
    else
        return false;
}


function FSM(client,action,maximizedHorizontal)
{



    log("An event arrived...")

    if(client == null)
    {
        log("...but client is null , so returning..");
        return;
    }
    else
        log("Client :"+client.windowId)


        switch(action)
        {

            case Action.CREATE:
            {
                log("Action CREATE detected");

                if(managedWindow(client)==true)
                {
                    log("Creating a new windowState object");
                    newWindowState = new windowState();
                    log("Setting the state to CREATED");
                    newWindowState.state=WindowStateStates.CREATED;
                    log("Adding the new window to a dictionary");
                    windowsState[client.windowId]=newWindowState;
                    log("Moving the workspace to desktop 1");
                    workspace.currentDesktop = 1;
                    log("Moving the client to desktop 1-");
                    client.desktop=1;
                    log("Connecting the shade handler (to maximize the window in main desktop)");
                    client.shadeChanged.connect(shadeHandler);
                }
                else
                    log("Avoiding add the window due to is an exception");
            }
            break;

            case Action.MAXIMIZE:
            {
                log("Action MAXIMIZE detected");

                if(managedWindow(client)==true)
                {
                    if(client.windowId in windowsState)
                    {

                        if(windowsState[client.windowId].state==WindowStateStates.CREATED ||
                            windowsState[client.windowId].state==WindowStateStates.MAXIMIZED ||
                            windowsState[client.windowId].state==WindowStateStates.MINIMIZED_AND_NOT_MAXIMIZED ||
                            windowsState[client.windowId].state==WindowStateStates.UNMAXIMIZED ||
                            windowsState[client.windowId].state==WindowStateStates.MAXIMIZEDINMAINDEKSTOP)
                        {
                            //Is necessary check if the client is not being moved because this means that a double click was made or a maximize button was clicked
                            //But could be that client is being moved and unamzimize at same time , to in that case  the true part of the if should be ignored
                            if (maximizedHorizontal || ( client.move==false && windowsState[client.windowId].state==WindowStateStates.MAXIMIZEDINMAINDEKSTOP))
                            {

                                log("Creating the new virtual desktop for the window, should be "+(workspace.desktops+1))
                                workspace.createDesktop(workspace.desktops+1, client.resourceName)
                                log("Updating the window state , the window was not moved yet")
                                windowsState[client.windowId].state=WindowStateStates.MAXIMIZED
                                log("Setting the second position desktop to the client")
                                client.desktop = workspace.desktops;
                                log("Setting the active client for the workspace")
                                workspace.activateClient = client;

                                log("Disconnecting the maximize handler")
                                workspace.clientMaximizeSet.disconnect(maximizeHandler);
                                log("Checking if the window need to be maximize (this happend the second maximization)")
                                if(maximizedHorizontal==false)
                                {
                                    log("Maximizing...")
                                    client.setMaximize(true,true);
                                }
                                log("Connecting the maximize handler")
                                workspace.clientMaximizeSet.connect(maximizeHandler);

                                log("Setting the properly workspace")
                                workspace.currentDesktop = client.desktop;

                                log("Setting state to MAXIMIZED");
                                windowsState[client.windowId].state=WindowStateStates.MAXIMIZED;
                                log("Removing the window border");
                                windowsState[client.windowId].hasBorders=!client.noBorder;
                                client.noBorder=true;

                            }
                            else
                            {
                                if(workspace.currentDesktop!=1 || ( client.move==true && windowsState[client.windowId].state==WindowStateStates.MAXIMIZEDINMAINDEKSTOP))
                                {
                                    log("Window is not maximized horizontally, so moving to desktop 1");
                                    desktopToDelete=workspace.currentDesktop-1;
                                    log("Getting where is placed the client (Desktop "+desktopToDelete+")");
                                    log("Moving the window to desktop 1");
                                    client.desktop = 1;
                                    log("Moving workspace to desktop 1");
                                    workspace.currentDesktop = 1;
                                    log("Removing desktop "+desktopToDelete);
                                    workspace.removeDesktop(desktopToDelete)
                                    log("Focus the client moved recently");
                                    workspace.activateClient = client;
                                    log("Setting state to UNMAXIMIZED");
                                    windowsState[client.windowId].state=WindowStateStates.UNMAXIMIZED;
                                    if(windowsState[client.windowId].hasBorders==true)
                                        client.noBorder=false;
                                    workspace.activeWindow=client;
                                }
                                else
                                    log("Nothing to do due to current desktop is 1");
                            }
                        }
                        else
                            log("Window is not in state CREATED or MINIMIZED_AND_NOT_MAXIMIZED ("+windowsState[client.windowId].state+")");
                    }
                    else
                        log("WindowState dictionary doesn´t contain "+client.windowId);
                }
                else
                    log("Avoiding maximize the window due to is an exception");
            }
            break;


            case Action.UNMAXIMIZE:
            {
                log("Action UNMAXIMIZE detected (this is triggered by escape button press");
                log("Getting the active client");
                activeClient=workspace.activeClient;

                if(activeClient.windowId in windowsState)
                {
                    if(managedWindow(activeClient)==true)
                    {
                        if(workspace.currentDesktop!=1)
                        {
                            log("Disconnecting the handler related with maximize window");
                            workspace.clientMaximizeSet.disconnect(maximizeHandler);
                            log("Running the full screen deactivation");
                            desktopToDelete=workspace.currentDesktop-1
                            log("Getting the desktop where client is placed "+desktopToDelete);
                            log("Unmaximize the window");
                            workspace.slotWindowMaximize()
                            log("Moving workspace to desktop 1");
                            workspace.currentDesktop = 1;
                            log("Moving the window to desktop 1");
                            activeClient.desktop=1
                            log("Removing desktop "+desktopToDelete);
                            workspace.removeDesktop(desktopToDelete)
                            log("Setting state to UNMAXIMIZED");
                            windowsState[activeClient.windowId].state=WindowStateStates.UNMAXIMIZED;
                            log("Connecting the handler related with maximize window");
                            workspace.clientMaximizeSet.connect(maximizeHandler);
                            log("Adding borders to the window");

                            if(windowsState[activeClient.windowId].hasBorders==true)
                                activeClient.noBorder=false;

                            log("Set as active window the unmaximized window");
                            workspace.activeWindow=activeClient;

                        }
                        else
                            log("Avoiding client due to is desktop 1");
                    }
                    else
                        log("Avoiding maximize the window due to is an exception");

                }
                else
                    log("WindowState dictionary doesn´t contain "+client.windowId);

            }
            break;

            case Action.MINIMIZE:
            {
                log("Action MINIMIZE");

                if(client.windowId in windowsState)
                {
                    if(managedWindow(client)==true)
                    {
                        if(workspace.currentDesktop!=1)
                        {
                            log("Getting desktop to delete");
                            desktopToDelete=workspace.currentDesktop-1
                            log("Desktop to delete "+desktopToDelete);
                            log("Disconnecting the handler relatated with minizime action");
                            workspace.clientMinimized.disconnect(minimizeHandler);
                            log("Moving workspace to desktop 1");
                            workspace.currentDesktop = 1;
                            log("Moving the window to desktop 1");
                            client.desktop=1
                            log("Removing desktop "+desktopToDelete);
                            workspace.removeDesktop(desktopToDelete)

                            log("Actual window state "+windowsState[client.windowId].state);

                            if(windowsState[client.windowId].state==WindowStateStates.MAXIMIZED)
                            {
                                windowsState[client.windowId].state=WindowStateStates.MINIMIZED_AND_MAXIMIZED;
                                log("Now window state is "+windowsState[client.windowId].state);
                            }

                            else
                            {
                                windowsState[client.windowId].state=WindowStateStates.MINIMIZED_AND_NOT_MAXIMIZED;
                                log("Now window state is "+windowsState[client.windowId].state);
                            }

                            log("Connecting the handler relatated with minizime action");
                            workspace.clientMinimized.connect(minimizeHandler);

                        }
                        else
                            log("Avoiding client due to is desktop 1");
                    }
                    else
                        log("Avoiding maximize the window due to is an exception");
                }
                else
                    log("WindowState dictionary doesn´t contain "+client.windowId);
            }
            break;

            case Action.CLOSE:
            {
                log("Action CLOSE");

                if(client.windowId in windowsState)
                {
                    if(managedWindow(client)==true)
                    {
                        if(client.desktop!=1)
                        {
                            log("Getting desktop to delete");
                            desktopToDelete=workspace.currentDesktop-1;
                            log("Desktop to delete "+desktopToDelete);
                            log("Moving workspace to desktop 1");
                            workspace.currentDesktop = 1;
                            log("Removing desktop "+desktopToDelete);
                            workspace.removeDesktop(desktopToDelete)
                            log("Deleting client");
                            delete windowsState[client.windowId]
                        }
                        else
                            log("Avoiding client due to is desktop 1");
                    }
                    else
                        log("Avoiding client due to is an exception");
                }
                else
                    log("WindowState dictionary doesn´t contain "+client.windowId);
            }
            break;

            case Action.UNMINIMIZED:
            {
                log("Action UNMINIMIZED");

                if(client.windowId in windowsState)
                {
                    if(managedWindow(client)==true)
                    {

                        log("State: "+windowsState[client.windowId].state)

                        if (windowsState[client.windowId].state==WindowStateStates.MINIMIZED_AND_MAXIMIZED)
                        {
                            log("Disconnecting the handler related with unminimize window");
                            workspace.clientUnminimized.disconnect(unminimizedHandler);
                            log("Creating the new virtual desktop for the window, should be "+(workspace.desktops+1))
                            workspace.createDesktop(workspace.desktops+1, client.resourceName)
                            log("Setting the client to the new desktop")
                            client.desktop = workspace.desktops;
                            log("Setting the active client for the workspace")
                            workspace.activateClient = client;
                            log("Setting the properly workspace")
                            workspace.currentDesktop = client.desktop;
                            log("Connecting the handler related with unminimize window");
                            workspace.clientUnminimized.connect(unminimizedHandler);
                            windowsState[client.windowId].state=WindowStateStates.MAXIMIZED
                            log("Now window state is "+windowsState[client.windowId].state);
                            log("Removing borders from window");
                            if(windowsState[client.windowId].hasBorders==true)
                                client.noBorder=true;

                        }
                        else
                            log("Window is not minimized and maximized");

                    }
                    else
                        log("Avoiding client due to is an exception");
                }
                else
                    log("WindowState dictionary doesn´t contain "+client.windowId);

            }
            break;


            case Action.SHADE:
            {
                log("Action SHADE detected (but this is used to maximimize in main Desktop)");
                log("Disconnecting maximimize handler")
                workspace.clientMaximizeSet.disconnect(maximizeHandler);
                log("Disconnecting shade handler")
                client.shadeChanged.disconnect(shadeHandler);
                log("Setting shade to ignore the shade action");

                client.shade=false;


                if(windowsState[client.windowId].state == WindowStateStates.CREATED ||
                    windowsState[client.windowId].state == WindowStateStates.UNMAXIMIZED)
                {
                    log("Height to save "+client.geometry.height);
                    log("Width to save "+client.geometry.width);
                    log("X position "+client.geometry.x);
                    log("Y position "+client.geometry.x);
                    log("Saving window geometry");
                    windowsState[client.windowId].previousHeigth=client.geometry.height;
                    windowsState[client.windowId].previousWidth=client.geometry.width;
                    log("Saving window position");
                    windowsState[client.windowId].previousX=client.geometry.x;
                    windowsState[client.windowId].previousY=client.geometry.y;
                    log("Maximizing the client");
                    client.setMaximize(true,true);
                    windowsState[client.windowId].state=WindowStateStates.MAXIMIZEDINMAINDEKSTOP
                    log("Now window state is "+windowsState[client.windowId].state);
                }
                else
                {
                    if(windowsState[client.windowId].state==WindowStateStates.MAXIMIZEDINMAINDEKSTOP)
                    {
                        client.setMaximize(false,false);
                        log("Height saved "+windowsState[client.windowId].previousHeigth);
                        log("Width saved "+windowsState[client.windowId].previousWidth);
                        log("Setting the previous size");
                        client.geometry.width=windowsState[client.windowId].previousWidth;
                        client.geometry.height=windowsState[client.windowId].previousHeigth;
                        log("Setting the previous position");
                        client.geometry.x=windowsState[client.windowId].previousX;
                        client.geometry.y=windowsState[client.windowId].previousY;
                        log("X position "+client.geometry.x);
                        log("Y position "+client.geometry.x);
                        windowsState[client.windowId].state=WindowStateStates.UNMAXIMIZED;
                        log("Now window state is "+windowsState[client.windowId].state);
                    }
                }
                workspace.clientMaximizeSet.connect(maximizeHandler);
                client.shadeChanged.connect(shadeHandler);
            }
            break;
    }


}


function minimizeHandler(client)
{
    log("Minimize action was called");
    FSM(client,Action.MINIMIZE,null);
}

function maximizeHandler(client, maximizedHorizontal, maximizedertical)
{
    log("Maximize action was callled");
    FSM(client,Action.MAXIMIZE,maximizedHorizontal);
}

function addedHandler(client)
{
    log("Added action was called");
    FSM(client,Action.CREATE,null);
}

function unmaximizeHandler(client)
{
    log("Unmaximize action was called");
    FSM(client,Action.UNMAXIMIZE,null);
}

function removedHandler(client)
{
    log("Remove action was called");
    FSM(client,Action.CLOSE,null);
}

function unminimizedHandler(client)
{
    log("Unminimized action was called");
    FSM(client,Action.UNMINIMIZED,null);
}


function shadeHandler()
{
    log("Shade action was called");
    client=workspace.activeClient;
    FSM(client,Action.SHADE,null);
}


function install()
{
    log("Initialize installation");
    workspace.clientUnminimized.connect(unminimizedHandler);
    workspace.clientAdded.connect(addedHandler);
    workspace.clientMinimized.connect(minimizeHandler);
    workspace.clientMaximizeSet.connect(maximizeHandler);
    workspace.clientRemoved.connect(removedHandler);

    for(i=1;i<workspace.desktops;i++)
        workspace.removeDesktop(i);

    log("Installation finished");
}


function uninstall() {
    log("Initialize uninstallation");
    workspace.clientUnminimized.disconnect(unminimizedHandler);
    workspace.clientAdded.disconnect(addedHandler);
    workspace.clientMinimized.disconnect(minimizeHandler);
    workspace.clientMaximizeSet.disconnect(maximizeHandler);
    workspace.clientRemoved.disconnect(removedHandler);
    log("Uninstallation finished");
}

registerUserActionsMenu(function(client){
    return {
        text: "Move a maximized window to a new virtual desktop",
        items: [
            {
                text: "Enabled",
                checkable: true,
                checked: state.enabled,
                triggered: function()
                {
                    state.enabled = !state.enabled;
                    if (state.enabled)
                    {
                        install();
                    }
                    else
                    {
                        uninstall();
                    }
                }
            },
        ]
    };
});

registerShortcut("Unmaximize", "Unmaximize window in full screen desktop", "Esc", unmaximizeHandler)
install();

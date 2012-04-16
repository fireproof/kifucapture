

#import "GocamClass.h"
#import "gocam_test.h"


@implementation GocamClass 

@synthesize callbackID;

-(void)print:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options  
{
    
    //The first argument in the arguments parameter is the callbackID.
    //We use this to send data back to the successCallback or failureCallback
    //through PluginResult.   
    self.callbackID = [arguments pop];
    
    int result[8];
    
    //Get the string that javascript sent us 
    NSString *stringObtainedFromJavascript = [arguments objectAtIndex:0]; 
    
    
    run_gocam([stringObtainedFromJavascript cString], &result);
    
    NSMutableArray *coordinateArray = [NSMutableArray array];
    for(int i = 0; i < 8; i++ ) {
        NSNumber *a = [NSNumber numberWithInt:result[i]];
        [coordinateArray addObject:(a)];
    }
         
         
    //Create Plugin Result 
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray: coordinateArray];
    //Checking if the string received is HelloWorld or not
   
    [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];
        
}

@end

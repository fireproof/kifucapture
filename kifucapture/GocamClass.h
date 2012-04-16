//
//  MyClass.h
//  kifucapture
//
//  Created by Todd Bryan on 4/15/12.
//  Copyright 2012 Matthew McClintock. All rights reserved.
//


#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@interface GocamClass : CDVPlugin {
    
    NSString* callbackID;  
}

@property (nonatomic, copy) NSString* callbackID;

//Instance Method  
- (void) print:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;

@end
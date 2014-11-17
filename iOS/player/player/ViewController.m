//
//  ViewController.m
//  player
//
//  Created by Anders Borum on 11/11/14.
//  Copyright (c) 2014 NOTA. All rights reserved.
//

#import <AVFoundation/AVFoundation.h>
#import "ViewController.h"
#import "SoundChunk.h"
#import "Book.h"
#import "BookPart.h"
#import "BridgeController.h"
#import "debug.h"

@interface ViewController () {
    NSArray* chunks;
    AVAudioPlayer* player;
    AVQueuePlayer* queuePlayer;

    BridgeController* bridge;
    
    Book* testBook;
    
    NSMutableDictionary* booksById;
    NSString* currentBookId;
}
@property (strong, nonatomic) IBOutlet UIWebView *webView;

@end

@implementation ViewController

#pragma mark LytDeviceProtocol

-(Book*)currentBook {
    if(currentBookId == nil) return nil;
    return [booksById objectForKey:currentBookId];
}

-(void)setBook:(id)bookData {
    Book* book = [Book bookFromDictionary:bookData];
    NSString* key = book.identifier;
    if(key) {
        [booksById setObject:book forKey:key];
    }
}

-(void)clearBook:(NSString*)bookId {
    if(bookId) {
        Book* book = [booksById objectForKey:bookId];
        [book stop];
        [book deleteCache];
        [booksById removeObjectForKey:bookId];
    }
}

-(void)play:(NSString*)bookId offset:(NSTimeInterval)offset {
    Book* oldBook = self.currentBook;
    if(![oldBook.identifier isEqualToString:bookId]) {
        [oldBook stop];
    }
    
    Book* book = [booksById objectForKey:bookId];
    currentBookId = book.identifier; // if bookId was not valid, book.identifier will be nil, which is wanted behaviour
    book.position = offset;
    [book play];
}

-(void)stop {
    Book* oldBook = self.currentBook;
    [oldBook stop];
}

-(void)cacheBook:(NSString*)bookId {
    Book* book = [booksById objectForKey:bookId];
    book.bufferLookahead = 999999;
}

-(void)clearBookCache:(NSString*)bookId {
    Book* book = [booksById objectForKey:bookId];
    book.bufferLookahead = 0;
    [book deleteCache];
}

#pragma mark -

-(void)loadTestBook {
    NSString* path = [[NSBundle mainBundle] pathForResource:@"37027.json" ofType:nil];
    NSData* data = [NSData dataWithContentsOfFile:path];
    NSDictionary* json = [NSJSONSerialization JSONObjectWithData:data options:0 error:NULL];
    
    NSURL* baseURL = [NSURL URLWithString:@"http://m.e17.dk/DodpFiles/20014/37027/"];
    testBook = [Book bookFromDictionary:json baseURL:baseURL];
    [testBook joinParts];
}

-(void)testPlay {
    queuePlayer = [testBook makeQueuePlayer];
    [queuePlayer play];
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(3 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        NSLog(@"play error: %@", queuePlayer.error);
    });
}

-(void)testDownload {
    [testBook deleteCache];
    testBook.bufferLookahead = 300;
    [testBook play];
}

-(void)loadBookshelf {
    NSURL* url = [NSURL URLWithString:@"http://m.e17.dk/#bookshelf?guest=true"];
    NSURLRequest* request = [NSURLRequest requestWithURL:url];
    
    [self.webView loadRequest:request];
}

- (void)viewDidLoad {
    
    [super viewDidLoad];
    // Do any additional setup after loading the view, typically from a nib.
    
    booksById = [NSMutableDictionary new];
    bridge = [BridgeController new];
    bridge.delegate = self;
    self.webView.delegate = bridge;
    
    [self loadTestBook];
    //[self testPlay];
    [self testDownload];
    
    //NSURL* url = [NSURL URLWithString:@"http://m.e17.dk/#login"];
    NSURL* url = [NSURL URLWithString:@"http://vps.algoritmer.dk/nota.html"];
    NSURLRequest* request = [NSURLRequest requestWithURL:url];
    [self.webView loadRequest:request];
}

- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end

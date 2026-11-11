// Generated from shared/explainer/ by scripts/build-fix-core.mjs. Do not edit by hand.
// Types for the offline error explainer (PRODUCT.md §5). Pure data: no I/O, no network, no secrets.

                                           

/** Facts read from a pasted package.json. Only names and version ranges are kept, never script bodies. */
                               
                
                      
                          
                        
                                                                                          
                                       
 

                              
                                                                   
                 
                
                                                           
                  
                                  
              
                                                                     
                   
                                                              
                        
                         
                                                                 
                     
 

                              
                                                     
                           
                                  
 

                                                                

                                   
                                   
                
                                                                                                    
                  
 

                               
                    
                                                                 
                   
                                            
                       
 

                                                                   

                                
                              
                        
                              
                                                                                      
                     
                                  
                                                                   
                
 

                            
                                       
                                                        

export const LIMITS = {
  /** Reject anything larger: it is almost certainly not a single error. */
  maxErrorChars: 200_000,
  /** Above this, keep the start and the end (errors are usually at the end). */
  analyseErrorChars: 40_000,
  maxLineChars: 1_000,
  maxCommandChars: 200,
  maxPackageJsonChars: 200_000,
  maxDependencies: 500,
}         ;

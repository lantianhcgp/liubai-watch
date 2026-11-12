"""Local, fail-closed timer-ownership adapter for the unchanged pinned logger.

ACE can return timer ID 0 and retains an executing callback's native Arguments.
Only timer sentinels/guards change; queue, transport, timings and capture do not.
"""


def adapt(data):
    source = data.decode('ascii')
    replacements = [
        ('i="",h=0,u=0,f=0', 'i="",h=null,u=null,f=0', 1),
        ('function w(o){h||(h=setTimeout(function(){h=0,',
         'function w(o){null!==h||(h=setTimeout(function(){h=null,', 1),
        ('u=h=0,l=0', 'u=h=null,l=0', 1),
        ('u=setTimeout(function(){try{a(0)}',
         'u=setTimeout(function(){u=null;try{a(0)}', 1),
        ('clearTimeout(h)', 'null!==h&&clearTimeout(h)', 4),
        ('clearTimeout(u)', 'null!==u&&clearTimeout(u)', 2),
        ('h=0)', 'h=null)', 1),
        ('h=0,w(50)', 'h=null,w(50)', 1),
        ('h=u=l=p=0', 'h=u=null,l=p=0', 1),
    ]
    for old, new, count in replacements:
        if source.count(old) != count:
            raise ValueError('Pinned logger timer shape drift')
        source = source.replace(old, new)
    output = source.encode('ascii')
    if len(output) > 3072 or b'.test(' in output:
        raise ValueError('Adapted logger exceeds original safety gate')
    return output

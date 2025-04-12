// BOJ - 4921 나무 블록

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
char svd, c;
int valid() {
    if(svd == '1' && (c == '4' || c == '5')) return 1;
    if(svd == '3' && (c == '4' || c == '5')) return 1;
    if(svd == '4' && (c == '2' || c == '3')) return 1;
    if(svd == '6' && (c == '2' || c == '3')) return 1;
    if(c == '8' && (svd == '5' || svd == '7')) return 1;
    if(svd == '8' && (c == '6' || c == '7')) return 1;
    return 0;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    int tc = 0;
    while(++tc) {
        string ss; svd = ' '; cin >> ss;
        if(ss == "0") return 0;
        int ret = 1;
        for(char ch : ss) {
            if(svd == ' ') { if(ch != '1') ret = 0; svd = ch; continue; }
            c = ch;
            ret &= valid();
            svd = ch;
        }
        if(ret && svd == '2') cout << tc << ". VALID\n";
        else cout << tc << ". NOT\n";
    }
}
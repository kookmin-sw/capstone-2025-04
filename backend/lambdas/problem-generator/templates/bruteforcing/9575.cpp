// BOJ - 9575 ( EC#3 - Problem 10 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int isLuckyNumber(int k) {
    if(!k) return 0;
    while(k) {
        if(k % 10 == 5 || k % 10 == 8) k /= 10;
        else return 0;
    }
    return 1;
}
void exec() {
    int an, bn, cn; vector<int> av, bv, cv;
    cin >> an; loop(i, 1, an) { int k; cin >> k; av.push_back(k); }
    cin >> bn; loop(i, 1, bn) { int k; cin >> k; bv.push_back(k); }
    cin >> cn; loop(i, 1, cn) { int k; cin >> k; cv.push_back(k); }

    set<int> s;
    for(int a : av) for(int b : bv) for(int c : cv) {
        if(isLuckyNumber(a + b + c)) s.insert(a + b + c);
    }
    cout << s.size() << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int t; cin >> t;
    while(t--) exec();
}